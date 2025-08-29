const templates = {
  memories: {
    base: {
      width: 1280,
      height: 720,
      fps: 30,
      audioTracks: [{
        mixVolume: 0.8
      }],
      defaults: {
        layer: {
          fontPath: './assets/fonts/Roboto-Regular.ttf'
        }
      }
    },
    defaults: {
      imageDuration: 3.5,
      maxVideoDuration: 8,
      transition: {
        name: 'fade',
        duration: 0.8
      },
      imageLayer: {
        zoomDirection: 'in',
        zoomAmount: 0.1
      },
      videoLayer: {
        mixVolume: 0.3
      }
    },
    intro: {
      duration: 2,
      layers: [{
        type: 'title',
        text: 'Memories',
        textColor: '#ffffff',
        backgroundColor: '#000000',
        position: 'center'
      }]
    },
    outro: {
      duration: 1.5,
      layers: [{
        type: 'title',
        text: '',
        backgroundColor: '#000000'
      }]
    }
  },

  nostalgia: {
    base: {
      width: 1280,
      height: 720,
      fps: 24,
      audioTracks: [{
        mixVolume: 0.7
      }]
    },
    defaults: {
      imageDuration: 4.5,
      maxVideoDuration: 10,
      transition: {
        name: 'crossfade',
        duration: 1.2
      },
      imageLayer: {
        zoomDirection: 'out',
        zoomAmount: 0.05
      },
      videoLayer: {
        mixVolume: 0.2
      }
    },
    intro: {
      duration: 3,
      layers: [{
        type: 'title',
        text: 'Once Upon a Time',
        textColor: '#f5f5dc',
        backgroundColor: '#2b2b2b',
        position: 'center'
      }]
    }
  },

  dynamic: {
    base: {
      width: 1280,
      height: 720,
      fps: 30,
      audioTracks: [{
        mixVolume: 1.0
      }]
    },
    defaults: {
      imageDuration: 2.5,
      maxVideoDuration: 5,
      transition: {
        name: 'directional-left',
        duration: 0.4
      },
      imageLayer: {
        zoomDirection: 'random',
        zoomAmount: 0.2
      },
      videoLayer: {
        mixVolume: 0.4
      }
    },
    intro: {
      duration: 1.5,
      layers: [{
        type: 'title',
        text: 'Let\'s Go!',
        textColor: '#00ff00',
        backgroundColor: '#000000',
        position: 'center'
      }]
    }
  },

  smooth: {
    base: {
      width: 1280,
      height: 720,
      fps: 30,
      audioTracks: [{
        mixVolume: 0.7
      }]
    },
    defaults: {
      imageDuration: 4,
      maxVideoDuration: 8,
      transition: {
        name: 'crossfade',
        duration: 1.0
      },
      imageLayer: {
        zoomDirection: 'in',
        zoomAmount: 0.05
      },
      videoLayer: {
        mixVolume: 0.25
      }
    },
    intro: {
      duration: 2.5,
      layers: [{
        type: 'title',
        text: 'Smooth Memories',
        textColor: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.7)',
        position: 'center'
      }]
    }
  },

  minimal: {
    base: {
      width: 1280,
      height: 720,
      fps: 24,
      audioTracks: [{
        mixVolume: 0.5
      }]
    },
    defaults: {
      imageDuration: 5,
      maxVideoDuration: 6,
      transition: {
        name: 'fade',
        duration: 0.3
      },
      imageLayer: {
        zoomDirection: null,
        zoomAmount: 0
      },
      videoLayer: {
        mixVolume: 0.2
      }
    },
    intro: {
      duration: 1,
      layers: [{
        type: 'title',
        text: '',
        backgroundColor: '#ffffff'
      }]
    },
    outro: {
      duration: 1,
      layers: [{
        type: 'title',
        text: '',
        backgroundColor: '#ffffff'
      }]
    }
  },

  classic: {
    base: {
      width: 1280,
      height: 720,
      fps: 25,
      audioTracks: [{
        mixVolume: 0.6
      }]
    },
    defaults: {
      imageDuration: 4,
      maxVideoDuration: 7,
      transition: {
        name: 'fade',
        duration: 0.5
      },
      imageLayer: {
        zoomDirection: null
      },
      videoLayer: {
        mixVolume: 0.3
      }
    },
    intro: {
      duration: 2,
      layers: [{
        type: 'title',
        text: 'Beautiful Moments',
        textColor: '#ffffff',
        backgroundColor: '#1a1a1a',
        position: 'center'
      }]
    },
    outro: {
      duration: 2,
      layers: [{
        type: 'title',
        text: 'The End',
        textColor: '#ffffff',
        backgroundColor: '#1a1a1a',
        position: 'center'
      }]
    }
  }
};

module.exports = {
  getTemplate: (style) => {
    return templates[style] || templates.memories;
  },

  getAllTemplates: () => {
    return Object.keys(templates).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      description: getTemplateDescription(key)
    }));
  }
};

function getTemplateDescription(style) {
  const descriptions = {
    dynamic: 'Fast-paced and energetic, great for action and adventure',
    smooth: 'Fluid transitions with elegant motion, perfect for storytelling',
    minimal: 'Clean and simple, focusing on content without distractions',
    memories: 'Soft transitions and gentle pacing, perfect for cherished moments',
    nostalgia: 'Vintage feel with slower transitions and warm tones',
    classic: 'Simple and elegant, timeless presentation'
  };
  return descriptions[style] || '';
}