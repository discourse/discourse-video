# frozen_string_literal: true

require 'base64'

module DiscourseVideo
  class MuxApi

    def self.create_direct_upload
      token_id = SiteSetting.discourse_video_mux_token_id
      token_secret = SiteSetting.discourse_video_mux_token_secret
      mp4_storage = SiteSetting.discourse_video_enable_mp4_download
      mp4_support = (mp4_storage == true) ? "standard" : "none"
      url = "https://api.mux.com/video/v1/uploads"
      auth = Base64.strict_encode64("#{token_id}:#{token_secret}")
      body = {
        new_asset_settings: {
          playback_policy: ["public"],
          mp4_support: mp4_support
        },
        cors_origin: "*",
      }
      response = Excon.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': "Basic #{auth}"
        },
        body: body.to_json
      )
      #TODO handle 401 unauthorized
      return JSON.parse(response.body) if [200, 201].include?(response.status)
    end

  end
end
