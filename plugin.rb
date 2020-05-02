# name: discourse-video
# about: Improved video upload and playback experience.
# version: 0.1
# authors: Blake Erickson
# url: https://github.com/oblakeerickson/discourse-video

enabled_site_setting :video_enabled

#https://stream.mux.com/FC9pbuRQwEgiTPDmm5PoRRO5lRhVyHUE.m3u8

after_initialize do
  require_relative 'app/jobs/regular/upload_video_to_provider'

  on(:post_process_cooked) do |doc, post|
    puts "!!!!!!!!!!!!POST PROCESS !!!!!!!!!!!!!!!!!!!!!"

    ### Find video file(s)
    post_uploads = PostUpload.where(post_id: post.id)
    post_uploads.each do |pu|
      # check if upload is a video
      upload = Upload.find_by(id: pu.upload_id)
      puts "################ #{upload.original_filename}"
      extension = File.extname(upload.original_filename).strip.downcase[1..-1]
      # TODO: Read these from site settings
      if extension.match(/(mov|mp4)/)
        puts "IS VIDEO !!!!!!!!!!!!!!"
        `curl -X POST -i https://api.mux.com/video/v1/assets -H "Content-Type: application/json" -u "a35c6c6f-ce9c-47af-8f78-f90a266efbc4:URH8cPOEuvcxIoJ//Z7aizMDcksA25Tkz1Ev9QDOxye30Bg8Ns+0S3Vw76K9+vMJApsjkO+axJ2" --data-binary @body.json`
        #Jobs.enqueue(1, :upload_video_to_provider, post_id: post.id, upload_id: upload.id, bypass_bump: bypass_bump)
      end
    end
  end
end
