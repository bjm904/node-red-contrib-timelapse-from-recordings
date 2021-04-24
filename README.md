# Node Red Timelapse from Recordings

# WORK IN PROGRESS CHECK BACK May 1, 2021

This node will scan a directory of video files and produce a timelapse GIF based on parameters.


I use this alongside https://github.com/blakeblackshear/frigate 24/7 recording to dynamically produce timelapse GIFs from recordings

Inputs


recordings_directory*

output_directory*

cpu_threads = 4 // Will be at least the number of cameras and up to this number. The actual number of simultanius ffmpeg subprocesses spawned may be less so you can overshoot a little

camera_name = '*' Glob

time_previous_hours = 24

time_start = null

time_end = null

output_target_duration_secs = 30

output_width = -1

output_height = -1

output_framerate = 30



Outputs GIFs

Limitations

# TODO:
- Add ability to specify file extentions to filter like .mp4 or .mkv
- 