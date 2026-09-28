export const initialCatalog = [
  {
    _id: 'tos-001',
    title: 'Tears of Steel',
    description: 'Set in a dystopian future Amsterdam, a ragtag team of scientists and military veterans battle a rogue biomechanical army to save humanity and confront past regrets.',
    genre: ['Sci-Fi', 'Action', 'VFX Drama'],
    duration: 734,
    thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    releaseYear: 2024,
    rating: 'PG-13',
    featured: true,
    scenes: [
      {
        sceneId: 'tos-scene-01',
        startTime: 0,
        endTime: 95,
        title: 'The Oude Kerk Perimeter',
        summary: 'Thom and his cyber-tactical squad position robotic defense turrets outside the ancient Amsterdam church while monitoring incoming mechanical signals.',
        characters: ['Thom', 'Frank', 'Celia', 'Barley'],
        context: [
          'Thom broke off his relationship with Celia years ago, sparking the biomechanical divergence.',
          'The team has only one broadcast device capable of transmitting the neural handshake.',
          'Atmospheric radar shows swarms of hostile airborne seekers converging on their quadrant.'
        ],
        keyDialogue: [
          { speaker: 'Thom', line: 'Turrets hot. Keep your scopes aligned to the bell tower.' },
          { speaker: 'Frank', line: 'We have thirty seconds before the primary relay goes dark.' }
        ]
      },
      {
        sceneId: 'tos-scene-02',
        startTime: 96,
        endTime: 240,
        title: 'The Mechanical Breach',
        summary: 'Enormous tripod machines breach the outer canals. Barley mounts the pulse cannon while Celia activates the holographic memory interface.',
        characters: ['Thom', 'Celia', 'Barley'],
        context: [
          'The tripods communicate via pulsed microwave frequencies that blind local electronics.',
          'Celia’s cybernetic prosthetic is tied to the central node of the rogue machine intelligence.',
          'If the pulse array loses phase calibration, the memory simulation will collapse.'
        ],
        keyDialogue: [
          { speaker: 'Celia', line: 'You always run when the machines start talking, Thom.' },
          { speaker: 'Thom', line: 'I am not running this time. Hold the frequency!' }
        ]
      },
      {
        sceneId: 'tos-scene-03',
        startTime: 241,
        endTime: 480,
        title: 'Neural Handshake Calibration',
        summary: 'Inside the church sanctuary, the team connects Celia to the neural projection deck, attempting to beam a reconciliatory memory pattern into the machine nexus.',
        characters: ['Thom', 'Celia', 'Captain'],
        context: [
          'The neural handshake requires both human brainwaves to align within 12 milliradians.',
          'The memory being transmitted is their final argument before Celia altered her physiology.',
          'The military command ordered an immediate carpet bombing if the handshake fails by 08:00.'
        ],
        keyDialogue: [
          { speaker: 'Captain', line: 'Five minutes to orbital air strike. Do it or die.' },
          { speaker: 'Celia', line: 'I remember what you said at the launch pad.' }
        ]
      },
      {
        sceneId: 'tos-scene-04',
        startTime: 481,
        endTime: 734,
        title: 'The Convergence & Resolution',
        summary: 'The machines freeze as the emotional resonance ripples across the Amsterdam skyline, forcing Thom and Celia to make their final decision about the future.',
        characters: ['Thom', 'Celia', 'Frank'],
        context: [
          'The global machine network accepts the truce and enters standby mode.',
          'Amsterdam’s canals illuminate with residual bio-electric luminescence.',
          'Thom realizes peace requires acknowledging mutual vulnerability.'
        ],
        keyDialogue: [
          { speaker: 'Thom', line: 'We did it. The grid is quiescent.' },
          { speaker: 'Celia', line: 'Then let us rebuild before the sun rises.' }
        ]
      }
    ],
    trivia: [
      {
        sceneId: 'tos-scene-01',
        category: 'Filmmaking',
        fact: 'Tears of Steel was shot on 4K digital video using Sony F65 cameras on location in Amsterdam, Netherlands.',
        timestamp: 45
      },
      {
        sceneId: 'tos-scene-02',
        category: 'Behind the Scenes',
        fact: 'All VFX, open-source 3D tracking, compositing, and rendering were executed completely inside Blender 2.6.',
        timestamp: 150
      },
      {
        sceneId: 'tos-scene-03',
        category: 'Story',
        fact: 'The church featured in the central scene is the historic Oude Kerk, Amsterdam’s oldest standing building founded around 1213.',
        timestamp: 320
      }
    ],
    variations: [
      {
        variationId: 'var-tos-01',
        sceneId: 'tos-scene-02',
        triggerTime: 120,
        question: 'Which tactical soundscape do you prefer for the tripod canal breach?',
        options: [
          { id: 'opt-synth', text: 'Classic Analog Cyberpunk Synthesizer', badge: 'Director Cut' },
          { id: 'opt-orchestral', text: 'Dramatic Cinematic Orchestral Strings', badge: 'Theatrical' },
          { id: 'opt-minimal', text: 'Hyper-Realistic Low-End Acoustic Rumble', badge: 'Atmospheric' }
        ]
      }
    ]
  },
  {
    _id: 'sintel-002',
    title: 'Sintel: The Dragon’s Path',
    description: 'A fierce lone wanderer named Sintel rescues and nurses a wounded juvenile dragon named Scales, embarking on a dangerous journey across frozen mountains to reclaim him from captivity.',
    genre: ['Animation', 'Fantasy', 'Adventure'],
    duration: 888,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    releaseYear: 2023,
    rating: 'PG',
    featured: true,
    scenes: [
      {
        sceneId: 'sintel-scene-01',
        startTime: 0,
        endTime: 180,
        title: 'The Frozen Ascent',
        summary: 'Sintel battles sub-zero winds and predatory cliff-beasts while scaling the treacherous Jagged Peaks, guided by an aging mystic.',
        characters: ['Sintel', 'The Shaman'],
        context: [
          'Sintel has tracked the dragon captor for fourteen months across three continents.',
          'Her blade is forged from meteoric cobalt, resistant to dragonfire.'
        ],
        keyDialogue: []
      }
    ],
    trivia: [
      {
        sceneId: 'sintel-scene-01',
        category: 'Story',
        fact: 'The name "Sintel" is derived from the Dutch word "sintel", meaning cinder or ember.',
        timestamp: 90
      }
    ],
    variations: []
  },
  {
    _id: 'bbb-003',
    title: 'Big Buck Bunny',
    description: 'A lovable giant rabbit with a heart of gold takes a stand against three forest bullies—a flying squirrel, a red fox, and a chinchilla—orchestrating hilarious mechanical traps.',
    genre: ['Animation', 'Comedy', 'Family'],
    duration: 596,
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    releaseYear: 2024,
    rating: 'G',
    featured: false,
    scenes: [
      {
        sceneId: 'bbb-scene-01',
        startTime: 0,
        endTime: 160,
        title: 'Morning in the Meadow',
        summary: 'Big Buck wakes up, smells the forest sunflowers, and watches butterflies flutter gently through the forest clearing.',
        characters: ['Big Buck Bunny', 'Butterflies'],
        context: [
          'Buck lives harmoniously in an apple tree meadow.',
          'The forest is peaceful until the forest bullies arrive.'
        ],
        keyDialogue: []
      }
    ],
    trivia: [],
    variations: []
  }
];
