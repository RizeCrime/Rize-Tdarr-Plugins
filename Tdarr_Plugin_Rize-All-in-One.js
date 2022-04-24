//// The One Plugin to Rule Them All
//// Brought to you by me, Rize :)
//// and me, Github Copilot :)


/* eslint-disable */
const details = () => ({
  id: 'Tdarr_Plugin_Rize-All-in-One',
  Stage: 'Pre-processing',
  Name: 'Rize\' All-in-One',
  Type: 'Video',
  Operation: 'Transcode',
  Description: 'This Plugin transcodes all files to a set quality. Audio/subtitles not affected.  \n\n',
  Version: '1.0.0',
  Tags: 'pre-processing,ffmpeg,nvenc h265,nvenc h264,x265,x264',
  
  // user inputs
  Inputs: [
  {
    name: 'customTag',
    type: 'string',
    defaultValue: 'TDARRPROCESSED',
    inputUI: {
      type: 'text',
    },
    tooltip: 'Custom Tag to be added to file. A tag is required to set an exit condition, otherwise Tdarr will keep processing the file indefinitely.',
  },
  // Set the video encoder to use for transcoding
  {
    name: 'videoEncoder',
    type: 'string',
    defaultValue: 'hevc_nvenc',
    inputUI: {
      type: 'text',
    },
    tooltip: 'The video encoder to use. "copy" will use the original video codec. \n"hevc_nvenc" for x265 nVidia GPU encoding and "h264_nvenc" for x264 nVidia GPU encoding. \nCheck FFMPEG documentation for more info: "ffmpeg -encoders" will list all available encoders.'
  },
  // Set the QP value to use for compression
  {
    name: 'qpValue',
    type: 'number',
    defaultValue: 24,
    inputUI: {
      type: 'text',
    },
    tooltip: 'The QP value to use for the x265 preset.'
  },
  // Set the encoder profile
  {
    name: 'encoderProfile',
    type: 'string',
    defaultValue: 'main10',
    inputUI: {
      type: 'text',
    },
    tooltip: 'The encoder profile to use for the chosen encoder. \n"main10" for x265 10bit and "high" for x264 8bit. \nCheck FFMPEG documentation for more info: "ffmpeg -h encoder=<your_encoder>" will list all available encoder parameters.'
  },
  // Set the default codec params
  {
    name: 'videoCodecParams',
    type: 'string',
    defaultValue: '-x265-params aq-mode=3',
    inputUI: {
      type: 'text',
    },
    tooltip: 'The codec parameters to use. \nDefaults are Sensible for x265 encoding, leave empty if you don\'t know what it does or are using x264. \nCheck FFMPEG documentation for more info: "ffmpeg -h encoder=<your_encoder>" will list all available encoder parameters.'
  },
  // Set the pixel format
  {
    name: 'pix_fmt',
    type: 'string',
    defaultValue: 'yuv420p10le',
    inputUI: {
      type: 'text',
    },
    tooltip: 'The pixel format to use. \n"yuv420p10le" for HEVC (x265) 10bit and "rgb24" or "yuv420p" for x264 8bit. \nCheck FFMPEG documentation for more info: not sure, check google lol.'
  },
  // Set the audio codec to use for transcoding
  {
    name: 'audioCodec',
    type: 'string',
    defaultValue: 'copy',
    inputUI: {
      type: 'text',
    },
    tooltip: 'The audio codec to use. "copy" will use the original audio codec.'
  },
  // Specify subtitle languages to keep
  {
    name: 'subtitleLanguages',
    type: 'string',
    defaultValue: 'eng',
    inputUI: {
      type: 'text',
    },
    tooltip: 'Comma separated list of subtitle languages to keep. "all" will keep all languages, empty or "none" will remove all subtitles.'
  },
  // Set the resolution limit for the output
  {
    name: 'resolutionLimit',
    type: 'number',
    defaultValue: 0,
    inputUI: {
      type: 'text',
    },
    tooltip: 'The maximum resolution to use for the x265 preset. 0 = no limit. Uses image width, not height!'
  },
  // specify wether to check final file size or not
  {
    name: 'forceTranscode',
    type: 'boolean',
    defaultValue: false,
    inputUI: {
      type: 'checkbox',
    },
    tooltip: 'Force transcoding even if the resulting file size is larger than the original.'
  }
  ],
});


// eslint-disable-next-line no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  // eslint-disable-next-line no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);

  const response = {
    processFile: false,
    preset: '',
    container: '.mkv',
    handBrakeMode: false,
    FFmpegMode: false,
    infoLog: 'Analyzing... \n',
    
    file,
    removeDromDB: false,
    updateDB: false,
  };

  // Check if file is a video
  if (file.fileMedium !== 'video') {
    response.processFile = false;
    response.infoLog += 'Not a video file, skipping... \n';
    return response;
  };

  // check if a custom tag was set, if not, set one to a default value
  if (inputs.customTag === '') {
    response.infoLog += 'No custom tag set, using default value: TDARRPROCESSED \n';
    details.customTag = 'TDARRPROCESSED';
  };

  // check if file has already been processed
  if (file.ffProbeData.format.tags[inputs.customTag.toUpperCase()] == true) {
    response.processFile = false;
    response.infoLog += 'File has already been processed, skipping... \n';

    // if forceTranscode if false
    if (!inputs.forceTranscode) {
    // check if new file is larger than original
      var oldSize = parseFloat(otherArguments.originalLibraryFile.file_size);
      var newSize = parseFloat(file.file_size);
      if (newSize > oldSize) {
        response.infoLog += 'New file is larger than original. \n';
        throw new Error(`New file is larger than original. Old File: ${oldSize.toFixed(2)} MB (${otherArguments.originalLibraryFile.file_size}), New File: ${newSize.toFixed(2)} (${file.file_size})MB`);
      };
    };

    return response;
  };

  // Mark File to be processed
  response.processFile = true;
  response.FFmpegMode = true;

  // prepare subtitle args
  var subtitleArgs = '';
  // if arg not 'all', split by comma and add each language to subtitle args
  if (inputs.subtitleLanguages !== 'all') {
    var subtitleLanguages = inputs.subtitleLanguages.split(',').map(function(item) {
      return item.trim();
    });
    for (var i = 0; i < subtitleLanguages.length; i++) {
      subtitleArgs += `-map 0:s:m:language:${subtitleLanguages[i]}? `;
    };
    response.infoLog += `Subtitles in "${subtitleLanguages.join(', ')}" will be kept. \n`;
  } 
  // if arg is 'all', add all languages to subtitle args
  else if (inputs.subtitleLanguages === 'all') {
    subtitleArgs = '-map 0:s? ';
    response.infoLog += 'All subtitles will be kept. \n';
  }
  // if arg is 'none', do not add any subtitles to the output
  else if (inputs.subtitleLanguages === 'none') {
    subtitleArgs = '';
    response.infoLog += 'No subtitles will be added to the output. \n';
  };

  // define encoding arg chunks
  var encodingArgsBaseStart = '-hwaccel auto <io> -analyzeduration 6000M -probesize 2147M -map 0:v:0 -c:V ';
  var encodingArgsVideoQuality = `${inputs.videoEncoder} ${inputs.videoCodecParams} -preset slow -rc constqp -qp ${inputs.qpValue} -profile:v ${inputs.encoderProfile} -pix_fmt ${inputs.pix_fmt} `;
  var encodingArgsVideoResolution = `-vf scale=${inputs.resolutionLimit}:-1 `;
  var encodingArgsAudio = `-map 0:a? -c:a ${inputs.audioCodec} `;
  var encodingArgsSubtitles = `${subtitleArgs} -c:s copy `;
  var encodingArgsCustomTag = `-metadata ${inputs.customTag}=1 -movflags +use_metadata_tags `;
  var encodingArgsBaseEnd = `-max_muxing_queue_size 4096`;  // 4096 should save on gpu memory

  // construct encoding args
  var encodingArgs = '';
  encodingArgs += encodingArgsBaseStart;
  encodingArgs += encodingArgsVideoQuality;
  if (inputs.resolutionLimit > 0) {
    response.infoLog += `Limiting ouput resolution to ${inputs.resolutionLimit}p wide. \n`;
    encodingArgs += encodingArgsVideoResolution;
  };
  encodingArgs += encodingArgsAudio;
  encodingArgs += encodingArgsSubtitles;
  if (inputs.customTag.length > 0) {
    encodingArgs += encodingArgsCustomTag;
  };
  encodingArgs += encodingArgsBaseEnd;

  response.preset = encodingArgs;
  response.infoLog += 'Starting to process. \n';

  return response
};

module.exports.details = details;
module.exports.plugin = plugin;