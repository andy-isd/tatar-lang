# app/controllers/submissions_controller.rb
class SubmissionsController < ApplicationController
  def new
    @submission = Submission.new
    @story_type = story_type_from_path
    @submission.story_type = @story_type
  end

  def create
    @submission = Submission.new(submission_params)
    @submission.status     = "pending"
    @submission.ip_address = request.remote_ip
    @story_type            = @submission.story_type

    if honeypot_filled? || duplicate_submission?
      redirect_to thank_you_submissions_path and return
    end

    if @submission.save
      redirect_to thank_you_submissions_path
    else
      render :new, status: :unprocessable_entity
    end
  end

  def thank_you
  end

  private

  def story_type_from_path
    case request.path
    when "/citeste" then "citeste"
    when "/spune" then "spune"
    else "spune"
    end
  end

  def submission_params
    params.require(:submission).permit(:audio, :story_type, :input_type, :duration)
  end

  def honeypot_filled?
    params[:website].present?
  end

  def duplicate_submission?
    Submission
      .where(ip_address: request.remote_ip)
      .where(created_at: 5.minutes.ago..)
      .exists?
  end
end