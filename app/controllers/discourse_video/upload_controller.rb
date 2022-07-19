# frozen_string_literal: true

module DiscourseVideo
  class UploadController < ::ApplicationController
    requires_plugin DiscourseVideo

    before_action :ensure_logged_in, :check_upload_permission, except: [:webhook]

    skip_before_action :check_xhr,
                      :preload_json,
                      :verify_authenticity_token,
                      :redirect_to_login_if_required,
                      only: [:webhook]

    def create
      unless is_authorised_video? params["filename"]
        raise Discourse::InvalidParameters, I18n.t("discourse_video.post.errors.upload_not_authorized", authorized_extensions: video_extensions_to_array.join(", "))
      end

      hijack do
        begin
          result = MuxApi.create_direct_upload
          video = DiscourseVideo::Video.new(
            video_id: result["data"]["id"],
            state: result["data"]["status"],
            user: current_user
          )
          api_request_url = result["data"]["url"]
        ensure
          video.save!
        end

        render json: {
          video_id: video.video_id,
          api_request_url: api_request_url,
          state: video.state
        }
      end
    end

    def webhook
      raise Discourse::InvalidAccess unless verified_signature?(request)

      data = JSON.parse(request.body.read)

      # Only process if it's a notification we care about.
      # Notifications could arrive out of order so be sure they don't overwrite
      #  state they shouldn't.

      if data["type"] == "video.upload.asset_created"
        upload_id = data["object"]["id"]
        video = DiscourseVideo::Video.find_by_video_id(upload_id)
        if video
          video.asset_id = data["data"]["asset_id"]
          if video.state != DiscourseVideo::Video::READY
            video.state = DiscourseVideo::Video::PENDING
          end
          video.save!
        end
      end

      if data["type"] == "video.asset.ready"
        asset_id = data["object"]["id"]
        upload_id = data["data"]["upload_id"]
        video = DiscourseVideo::Video.find_by_video_id(upload_id)
        if video
          video.asset_id = asset_id unless video.asset_id
          video.playback_id = data["data"]["playback_ids"][0]["id"]
          video.state = DiscourseVideo::Video::READY
          video.save!

          video.update_video_post_fields!
          video.publish_change_to_clients!

          if respond_to?(:discourse_chat)
            video.update_video_chat_message_fields!
            video.publish_chat_message_change_to_clients!
          end
        end
      end

      if data["type"] == "video.asset.static_renditions.ready"
        upload_id = data["data"]["upload_id"]
        video = DiscourseVideo::Video.find_by_video_id(upload_id)
        filenames = []

        if video
          files = data["data"]["static_renditions"]["files"]
          files.each do |f|
            filenames << f["name"]
          end

          if filenames.include?("high.mp4")
            video.mp4_filename = "high.mp4"
          else
            video.mp4_filename = "low.mp4"
          end

          video.save!
        end

      end

      render json: success_json

    end

    def check_upload_permission
      raise Discourse::InvalidAccess unless guardian.can_upload_video?
    end

    private

    def is_authorised_video?(filename)
      filename.match? Regexp.new "\\.(#{video_extensions_to_array.join("|")})", Regexp::IGNORECASE
    end

    def video_extensions_to_array
      SiteSetting.discourse_video_file_extensions
        .downcase
        .gsub(/[\s\.]+/, "")
        .split("|")
        .select { |ext| ext.index("*") != -1 }
    end

    def verified_signature?(request)
      mux_signature = request.headers["Mux-Signature"]

      return if !mux_signature

      mux_sig_array = mux_signature.split(",")

      return if !mux_sig_array || !mux_sig_array[0] || !mux_sig_array[1]

      mux_timestamp = mux_sig_array[0].gsub("t=", "")
      mux_hash = mux_sig_array[1].gsub("v1=", "")
      payload = "#{mux_timestamp}.#{request.body.string}"
      our_signature = OpenSSL::HMAC.hexdigest(OpenSSL::Digest.new('sha256'), SiteSetting.discourse_video_mux_webhook_signing_secret, payload)

      our_signature == mux_hash
    end
  end
end
