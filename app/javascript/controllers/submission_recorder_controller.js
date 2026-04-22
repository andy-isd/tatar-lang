import { Controller } from "@hotwired/stimulus"
import { DirectUpload } from "@rails/activestorage"

export default class extends Controller {
  static targets = [
    "recordLabel",
    "recordIcon",
    "recordControls",
    "pauseButton",
    "pauseLabel",
    "pauseIcon",
    "submitButton",
    "indicator",
    "audioUpload",
    "audioPreview",
    "inputType",
    "duration",
    "recordedAudioSignedId",
    "uploadButton",
    "switchToRecordButton"
  ]

  connect() {
    this.mediaRecorder = null
    this.recording = false
    this.requestingMicrophone = false
    this.paused = false
    this.chunks = []
    this.previewUrl = null
    this.startTime = null
    this.pausedAt = null
    this.pausedDurationMs = 0
    this.stream = null
    this.setRecordIcon("lni-microphone-1")
    this.setPauseButtonVisible(false)
    this.syncRecordedAudioField()
    this.resetInputModeUi()
  }

  disconnect() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    this.clearPreview()
  }

  async toggleRecording() {
    if (this.requestingMicrophone) return

    if (!this.recording) {
      try {
        await this.startRecording()
      } catch (_error) {
        // Permission can be dismissed/denied; keep UI stable and avoid uncaught promise errors.
        this.recording = false
        this.recordLabelTarget.textContent = "Înregistrează"
        this.setRecordIcon("lni-microphone-1")
        this.indicatorTarget.classList.add("hidden")
        this.setUploadButtonHidden(false)
        this.setRecordControlsHidden(false)
      }
    } else {
      this.stopRecording()
    }
  }

  triggerUpload() {
    if (this.hasAudioUploadTarget) {
      this.audioUploadTarget.click()
    }
  }

  uploadChanged() {
    const file = this.audioUploadTarget.files[0]
    if (!file) {
      this.resetInputModeUi()
      return
    }

    this.setInputType("uploaded")
    if (this.hasRecordedAudioSignedIdTarget) {
      this.recordedAudioSignedIdTarget.value = ""
      this.syncRecordedAudioField()
    }
    if (this.hasAudioUploadTarget) {
      this.audioUploadTarget.disabled = false
    }
    this.submitButtonTarget.classList.remove("hidden")
    this.showPreview(URL.createObjectURL(file))

    if (this.hasUploadButtonTarget) {
      this.uploadButtonTarget.innerHTML = `<i class="lni lni-upload-1"></i> ✓ ${file.name}`
    }

    this.setRecordControlsHidden(true)
    this.setUploadButtonHidden(false)
    if (this.hasSwitchToRecordButtonTarget) {
      this.switchToRecordButtonTarget.classList.remove("hidden")
    }
  }

  switchToRecording() {
    if (this.hasAudioUploadTarget) {
      this.audioUploadTarget.value = ""
      this.audioUploadTarget.disabled = false
    }
    if (this.hasRecordedAudioSignedIdTarget) {
      this.recordedAudioSignedIdTarget.value = ""
      this.syncRecordedAudioField()
    }
    this.clearPreview()
    this.setInputType("recorded")
    this.submitButtonTarget.classList.add("hidden")

    this.setRecordControlsHidden(false)
    this.setUploadButtonHidden(false)
    if (this.hasSwitchToRecordButtonTarget) {
      this.switchToRecordButtonTarget.classList.add("hidden")
    }
    if (this.hasUploadButtonTarget) {
      this.uploadButtonTarget.innerHTML = `<i class="lni lni-upload-1"></i> Încarcă fișier`
    }
  }

  async startRecording() {
    this.requestingMicrophone = true
    this.clearPreview()
    this.setInputType("recorded")
    this.setRecordControlsHidden(false)
    this.setUploadButtonHidden(true)
    if (this.hasSwitchToRecordButtonTarget) {
      this.switchToRecordButtonTarget.classList.add("hidden")
    }
    if (this.hasAudioUploadTarget) {
      this.audioUploadTarget.value = ""
      this.audioUploadTarget.disabled = false
    }
    if (this.hasRecordedAudioSignedIdTarget) {
      this.recordedAudioSignedIdTarget.value = ""
      this.syncRecordedAudioField()
    }
    if (this.hasUploadButtonTarget) {
      this.uploadButtonTarget.innerHTML = `<i class="lni lni-upload-1"></i> Încarcă fișier`
    }

    try {
      // Always ask the browser for microphone access when starting a new recording.
      // If permission is still in "prompt", this re-triggers the permission dialog.
      this.stream = await this.requestMicrophoneStream()
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: "audio/webm;codecs=opus" })
      this.chunks = []
      this.startTime = Date.now()
      this.pausedDurationMs = 0
      this.pausedAt = null
      this.paused = false

      this.mediaRecorder.ondataavailable = (event) => this.chunks.push(event.data)
      this.mediaRecorder.onstop = () => this.handleRecordingStopped()

      this.mediaRecorder.start()
      this.recording = true
      this.recordLabelTarget.textContent = "Stop înregistrare"
      this.setRecordIcon("lni-check-square-2")
      this.setPauseButtonVisible(true)
      this.setPauseState(false)
      this.indicatorTarget.classList.remove("hidden")
    } finally {
      this.requestingMicrophone = false
    }
  }

  async requestMicrophoneStream() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone API unavailable")
    }

    return navigator.mediaDevices.getUserMedia({ audio: true })
  }

  stopRecording() {
    if (!this.mediaRecorder) return

    if (this.paused && this.pausedAt) {
      this.pausedDurationMs += Date.now() - this.pausedAt
      this.pausedAt = null
    }

    this.mediaRecorder.stop()
    this.recording = false
    this.paused = false
    this.recordLabelTarget.textContent = "Încearcă din nou"
    this.setRecordIcon("lni-refresh-circle-1-clockwise")    
    this.setPauseButtonVisible(false)
    this.indicatorTarget.classList.add("hidden")
    this.setInputType("recorded")
  }

  async handleRecordingStopped() {
    const duration = Math.round((Date.now() - this.startTime - this.pausedDurationMs) / 1000)
    this.durationTarget.value = duration

    const blob = new Blob(this.chunks, { type: "audio/webm" })
    this.showPreview(URL.createObjectURL(blob))
    const file = new File([blob], "recording.webm", { type: "audio/webm" })

    const upload = new DirectUpload(file, "/rails/active_storage/direct_uploads")

    upload.create((error, blobData) => {
      if (error) return

      this.recordedAudioSignedIdTarget.value = blobData.signed_id
      this.syncRecordedAudioField()
      if (this.hasAudioUploadTarget) {
        this.audioUploadTarget.value = ""
        this.audioUploadTarget.disabled = true
      }
      this.submitButtonTarget.classList.remove("hidden")
    })

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
  }

  togglePause() {
    if (!this.mediaRecorder || !this.recording) return

    if (!this.paused) {
      this.mediaRecorder.pause()
      this.paused = true
      this.pausedAt = Date.now()
      this.setPauseState(true)
      this.indicatorTarget.classList.add("hidden")
      return
    }

    this.mediaRecorder.resume()
    this.paused = false

    if (this.pausedAt) {
      this.pausedDurationMs += Date.now() - this.pausedAt
      this.pausedAt = null
    }

    this.setPauseState(false)
    this.indicatorTarget.classList.remove("hidden")
  }

  showPreview(url) {
    if (!this.hasAudioPreviewTarget) return

    this.clearPreview()
    this.previewUrl = url
    this.audioPreviewTarget.src = url
    this.audioPreviewTarget.classList.remove("hidden")
    this.audioPreviewTarget.load()
  }

  clearPreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl)
      this.previewUrl = null
    }

    if (this.hasAudioPreviewTarget) {
      this.audioPreviewTarget.pause()
      this.audioPreviewTarget.removeAttribute("src")
      this.audioPreviewTarget.load()
      this.audioPreviewTarget.classList.add("hidden")
    }
  }

  setRecordIcon(iconClass) {
    if (!this.hasRecordIconTarget) return

    this.recordIconTarget.innerHTML = `<i class="lni ${iconClass}"></i>`
  }

  setPauseState(isPaused) {
    if (!this.hasPauseLabelTarget || !this.hasPauseIconTarget) return

    this.pauseLabelTarget.textContent = isPaused ? "Reia" : "Pauză"
    this.pauseIconTarget.innerHTML = `<i class="lni ${isPaused ? "lni-play" : "lni-pause"}"></i>`
  }

  setPauseButtonVisible(visible) {
    if (!this.hasPauseButtonTarget) return

    this.pauseButtonTarget.classList.toggle("hidden", !visible)
  }

  setInputType(value) {
    if (!this.hasInputTypeTarget) return

    this.inputTypeTarget.value = value
  }

  // Empty hidden `submission[audio]` would be sent alongside the file and make Rails treat audio as blank.
  syncRecordedAudioField() {
    if (!this.hasRecordedAudioSignedIdTarget) return

    const hasId = Boolean(this.recordedAudioSignedIdTarget.value?.trim())
    this.recordedAudioSignedIdTarget.disabled = !hasId
  }

  setRecordControlsHidden(hidden) {
    if (!this.hasRecordControlsTarget) return

    this.recordControlsTarget.classList.toggle("hidden", hidden)
  }

  setUploadButtonHidden(hidden) {
    if (!this.hasUploadButtonTarget) return

    this.uploadButtonTarget.classList.toggle("hidden", hidden)
  }

  resetInputModeUi() {
    this.setRecordControlsHidden(false)
    this.setUploadButtonHidden(false)
    if (this.hasSwitchToRecordButtonTarget) {
      this.switchToRecordButtonTarget.classList.add("hidden")
    }
  }
}
