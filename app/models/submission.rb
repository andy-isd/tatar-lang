# app/models/submission.rb
class Submission < ApplicationRecord
  has_one_attached :audio

  STORY_TYPES = %w[citeste spune].freeze
  INPUT_TYPES = %w[recorded uploaded].freeze
  STATUSES    = %w[pending approved rejected].freeze

  validates :story_type, inclusion: { in: STORY_TYPES }
  validates :input_type, inclusion: { in: INPUT_TYPES }
  validates :status,     inclusion: { in: STATUSES }
  validates :audio,
    presence: true,
    content_type: %w[audio/mpeg audio/x-wav audio/vnd.wave audio/webm audio/ogg audio/mp4 audio/x-m4a],
    size: { less_than: 100.megabytes }

  scope :pending,  -> { where(status: "pending") }
  scope :approved, -> { where(status: "approved") }
  scope :rejected, -> { where(status: "rejected") }
  scope :recent,   -> { order(created_at: :desc) }

  def pending?  = status == "pending"
  def approved? = status == "approved"
  def rejected? = status == "rejected"

  def approve! = update!(status: "approved")
  def reject!  = update!(status: "rejected")
end