module DiscourseVideo
  class UploadController < ::ApplicationController
    requires_plugin DiscourseVideo

    #before_action :ensure_logged_in, :check_upload_permission, except: [:callback]

    #skip_before_action :check_xhr,
    #                  :preload_json,
    #                  :verify_authenticity_token,
    #                  :redirect_to_login_if_required,
    #                  only: [:callback]

    def create
      name = params.require(:name)
      filename = params.require(:filename)

      hijack do
        begin
          direct_upload = MuxApi.create_direct_upload_2
          result = JSON.parse(direct_upload)
          puts result["data"]
          puts result["data"]["url"]
          puts "======================================"
          #api = API.create(name)
          #video = Brightcove::Video.new(video_id: api.id, state: Brightcove::Video::PENDING, user: current_user)
          video = DiscourseVideo::Video.new(
            video_id: result["data"]["id"],
            state: result["data"]["status"],
            user: current_user,
            api_request_url: result["data"]["url"]
          )
          #api.move_to_folder(SiteSetting.brightcove_folder_id) unless SiteSetting.brightcove_folder_id.blank?
          #ingest_info = api.get_ingest_url(filename)
          #video.secret_access_key = ingest_info[:secret_access_key]
          #video.api_request_url = ingest_info[:api_request_url]
        ensure
          video.save!
        end

        render json: {
          video_id: video.video_id,
          api_request_url: video.api_request_url,
          state: video.state
        }
      end
    end
  end
end
