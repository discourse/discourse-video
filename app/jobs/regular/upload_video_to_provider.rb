module Jobs
  class UploadVideoToProvider < ::Jobs::Base

    def execute(args)
      return unless SiteSetting.video_enabled

      log(:debug, "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ #{args.inspect}")
      File.open("sidekiq-log.txt", 'w') { |file| file.write(args.inspect) }

      `curl -X POST -i https://api.mux.com/video/v1/assets -H "Content-Type: application/json" -u "a35c6c6f-ce9c-47af-8f78-f90a266efbc4:URH8cPOEuvcxIoJ//Z7aizMDcksA25Tkz1Ev9QDOxye30Bg8Ns+0S3Vw76K9+vMJApsjkO+axJ2" --data-binary @body.json`
    end
  end
end
