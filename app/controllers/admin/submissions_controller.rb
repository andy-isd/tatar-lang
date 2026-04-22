# app/controllers/admin/submissions_controller.rb
class Admin::SubmissionsController < ApplicationController  
  http_basic_authenticate_with name: "admin", password: Rails.application.credentials.admin_password


  def index
    @status      = params[:status].presence_in(Submission::STATUSES) || "pending"
    @submissions = Submission.where(status: @status).with_attached_audio.recent
  end

  def show
    @submission = Submission.with_attached_audio.find(params[:id])
  end

  def download
    @submission = Submission.with_attached_audio.find(params[:id])

    unless @submission.audio.attached?
      redirect_to admin_submission_path(@submission), alert: "No audio file attached."
      return
    end

    send_data @submission.audio.download,
      filename: "submission_#{@submission.id}.#{@submission.audio.filename.extension}", 
      type: @submission.audio.content_type,
      disposition: :attachment
  end

  def update
    @submission = Submission.find(params[:id])

    case params[:action_type]
    when "approve" then @submission.approve!
    when "reject"  then @submission.reject!
    end

    redirect_to admin_submissions_path, notice: "Submission #{params[:action_type]}d."
  end

  def destroy
    @submission = Submission.find(params[:id])
    @submission.audio.purge
    @submission.destroy
    redirect_to admin_submissions_path, notice: "Deleted."
  end
end