# Node Red Timelapse from Recordings for Frigate

This node will scan a directory of video files and produce a timelapse GIF based on parameters. Each video file is one frame of the timelapse.


To be used alongside **Frigate&apos;s** 24/7 recording to dynamically produce timelapse GIFs from recordings.
https://github.com/blakeblackshear/frigate

Properties on msg object will override the configuration on the node itself. Defaults are shown below next to applicable property names.
```
msg = {
	recordings_directory
	output_directory
	camera_name = '*'
	cpu_threads = 4
	time_previous_hours = 24
	time_start
	time_end 
	output_target_duration_secs = 30
	output_width
	output_height
	output_framerate = 30
}
```

Outputs H.264 to `/output_directory/camera_name.mp4`

# TODO:
- Add ability to specify file extentions to filter like .mp4 or .mkv
- Add ability to create non-continuous timelapses. Example: "Noon every day for last 30 days"
- Add better filtering out of corrupt videos / frames