# discourse-video

DiscourseVideo is a Discourse plugin that provides an improved video upload
and playback experience using [Mux](https://mux.com/).

Features include:

- Upload large videos in chunks
- Play videos via streaming so that you don't have to download the whole video
  to watch
- Automatic video encoding
- Videos are stored externally by mux so that they don't take up space on your
  Discourse instance.

## Installation

Follow the [Install Plugins in
Discourse](https://meta.discourse.org/t/install-plugins-in-discourse/19157)
guide, using git clone https://github.com/oblakeerickson/discourse-video.git as
the plugin command.

## Setup

You will need to have a [Mux](https://mux.com) account. Then you can create a
Token ID and Secret from Mux to add to your Site Settings in Discourse.

Then inside of Mux you will need to create a webhook and point it back to
`https://your-discourse.example.com/discourse_video/webhook`.

## Development

If you are developing you can use a tool like ngrok to point it back to your
localhost and then add the ngrok url to the `DISCOURSE_DEV_HOSTS` env variable
before starting rails.
