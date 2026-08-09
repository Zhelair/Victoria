# Victoria Lore Bible v1

Status: working design draft  
Project: Victoria Pocket Life Companion  
Mode: planning only, no implementation decisions are final

## 1. Core premise

Victoria is a small mystery mansion contained inside a pocket companion device. The mansion is alive, but damaged by drift, neglect, overload, and unfinished intentions. Its residents are not random pets. Each one protects a different part of a stable life: survival, focus, courage, healing, and order.

When the player completes real actions in daily life, the mansion regains vitality. Rooms brighten, props return, doors unlock, bosses weaken, and residents open up. The player begins in Creature's room, but the whole house exists from the start. Other doors are visible. The garden is open from the beginning, but only unlocked residents appear there.

The app should feel like a real game, but the useful life systems remain real: planning, habits, reminders, scoring rules, and reflection.

## 2. Pillars

1. Real life actions drive progression.
2. Companion care deepens bond, but never replaces real progress.
3. The mansion is the world-state of the player's life.
4. Bosses represent recurring friction, not fantasy enemies.
5. Recovery matters as much as streaks.
6. The app should still work well without AI.

## 3. World structure

### Entrance Hall

- Main hub
- Daily summary
- Chapter progress
- Boss warning board
- Mansion map access

### First floor

- Cat room
- Sweetheart room
- Robot room
- Hallway scenes

### Second floor

- Creature room
- Plant Spirit room
- Locked spare door for future content

### Shared outdoor space

- Garden is open from the start
- Only unlocked residents appear there
- Characters can gather there, react to each other, and offer side quests
- Garden becomes the social heart of the mansion

### Late-game expansion

- Locked second-floor wing
- Attic
- Basement
- Greenhouse
- Clock tower or observatory

The mansion should stay compact at first. Fewer spaces with richer state changes are better than too many shallow rooms.

## 4. Character roster

## Creature

- Domain: survival, reset, body, momentum
- Starting guide for free users
- Starting room: second floor
- First impression: fragile but willing
- Long arc: from barely holding on to playful resilience
- Best for players rebuilding basics
- Main themes: movement, food, sleep, recovery, tiny wins

Why choose Creature:
- You feel overwhelmed
- You need to restart gently
- You want the least judgmental companion

Existing care logic to preserve:
- Feed
- Play
- Clean
- Sleep

## Cat

- Domain: boundaries, focus, routine, independence
- Starting room: first floor
- First impression: guarded, dry, observant
- Long arc: from distant and skeptical to loyal and quietly affectionate
- Best for players protecting time and attention
- Main themes: focus blocks, tidy surfaces, reduced noise, saying no

Why choose Cat:
- You are scattered
- You need discipline without shouting
- You want quiet, sharp energy

Existing care logic to preserve:
- Mouse toy
- Treat
- Belly rub
- Nap

## Sweetheart

- Domain: courage, self-worth, encouragement, results
- Starting room: first floor
- First impression: warm, stylish, gently demanding
- Long arc: from supportive observer to proud partner in growth
- Best for players chasing goals, career progress, or brave action
- Main themes: showing up, self-presentation, asking, applying, finishing

Why choose Sweetheart:
- You want momentum toward visible results
- You need encouragement, not cold pressure
- You want a companion who believes you can do more

Existing care logic to preserve:
- Compliment
- Gift
- Encourage
- Rest

## Plant Spirit

- Domain: calm, care, emotional repair, home warmth, slow growth
- Starting room: second floor
- First impression: soft, quiet, restorative
- Long arc: from wilted and shy to radiant and grounding
- Best for players healing from stress, burnout, grief, or inner chaos
- Main themes: hydration, breathing room, sleep, gentle cleaning, softness

Why choose Plant Spirit:
- You need healing more than pushing
- You want a cozy-home feeling
- You need proof that slow growth still counts

Care logic to add:
- Water
- Sunlight
- Tidy corner
- Hum

## Robot

- Domain: systems, optimization, productivity, anti-chaos
- Starting room: first floor
- First impression: efficient, precise, emotionally distant
- Long arc: from rigid operator to reliable old friend
- Best for players who want structure, planning, and execution
- Main themes: queue sorting, friction removal, sequencing, systems that serve life

Why choose Robot:
- You want order
- You want to build routines and plans
- You like clean logic and visible structure

Care logic to add:
- Recharge
- Polish
- Calibrate
- Diagnostics

## 5. Player onboarding and setup

Onboarding should return in a lighter, smarter form.

### Setup questions

1. What chapter are you in right now?
- Job / career
- Fitness / body
- Focus / discipline
- Calm / healing
- Sobriety / habit change
- Custom

2. What pace do you want?
- Gentle
- Steady
- Serious

3. Which guide do you want to begin with?
- Creature
- Cat
- Sweetheart
- Plant Spirit
- Robot

### Priority model

- One main priority
- Custom tags
- The priority system drives quest weighting, achievements, boss pressure, and room flavor

Examples of custom tags:
- Sleep
- Alcohol
- Dating
- Study
- Money
- Anxiety
- Cleaning
- Routine

Creature is still the default free starter if the player skips choice, but choosing Creature does not break lore. It only means the first active room and the first resident bond start there.

## 6. Time structure

Victoria is not a finite game. It runs in chapters.

### Chapter lengths

- 1 day: emergency reset
- 3 days: short recovery sprint
- 7 days: standard chapter
- 14 days: deeper challenge arc

### What chapter length affects

- Quest count
- Boss pressure thresholds
- Achievement thresholds
- Story pacing
- Room restoration speed
- Chapter-end recap tone

Recommended default:
- 7 days for most users
- 1 day remains available as a reset mode

## 7. Progression systems

The current app already has a main score. Keep it. Reframe it through lore.

### Global progression

- House Vitality: current main score, overall state of the mansion
- Chapter Progress: current run progress toward the chosen time frame
- Boss Pressure: hidden or semi-visible pressure meter fed by damage rules
- House Level: major world unlocks such as rooms, floors, and mansion scenes

### Per-character progression

- Bond Level: trust, story, reactions, special scenes
- Discipline Level: strength in that life domain, harder quests, better resistance to bosses
- Room Level: room visuals, props, lighting, ambient richness

### Important principle

Real-life actions:
- drive House Vitality
- drive Chapter Progress
- weaken or feed bosses
- raise Discipline Level

Companion care actions:
- slightly affect House Vitality
- mainly affect Bond Level
- unlock micro-dialogue and cozy scenes

## 8. Scoring system alignment

The current scoring rules system should remain the backbone.

### Current app logic to preserve

- Positive rules
- Damage rules
- Pinned home actions
- Chat rule suggestions
- Manual care actions

### Lore interpretation

- Positive rules restore energy to the mansion
- Damage rules feed specific bosses
- Pinned home actions become recommended chapter actions
- Character care actions become bond actions

### Example mapping

Applied to a job:
- Positive score
- Weakens The Silence
- Boosts Sweetheart relationship and ambition flavor

No alcohol today:
- Positive score
- Weakens The Pull
- Boosts Creature or Plant Spirit domains

Walked 2km+:
- Positive score
- Weakens The Fog
- Boosts Creature domain

Skipped morning check-in:
- Negative score
- Feeds The Drift

No workout on workout day:
- Negative score
- Feeds The Fog or The Rust

2+ drinks:
- Negative score
- Feeds The Pull

No job application in 3 days:
- Negative score
- Feeds The Silence or The Pile

## 9. Boss system

Bosses are recurring forms of friction. They should not feel random or theatrical. They should feel familiar and personal.

### Main bosses

## The Drift

- Theme: no direction, no start, vague days
- Fed by: skipped check-ins, no plan, avoidance, vague task lists
- Best counters: Creature, Robot

## The Fog

- Theme: low energy, heavy body, poor sleep, no movement
- Fed by: bad sleep, no workout, no walk, no care basics
- Best counters: Creature, Plant Spirit

## The Pull

- Theme: habits that drag the player backward
- Fed by: drinking, compulsions, numbing loops
- Best counters: Creature, Plant Spirit, Cat

## The Pile

- Theme: backlog, clutter, overdue tasks, mental load
- Fed by: unfinished chores, ignored admin, messy environments
- Best counters: Robot, Cat

## The Silence

- Theme: not applying, not asking, not showing up
- Fed by: hiding from visible action, delayed career moves, fear of outreach
- Best counters: Sweetheart, Robot

## The Rust

- Theme: routine decay, system breakdown, creeping sloppiness
- Fed by: broken habits, ignored routines, scattered follow-through
- Best counters: Robot, Cat

### Boss pressure and encounters

A boss should not always mean a giant forced battle scene. It should mean rising pressure that can become an encounter if ignored.

Pressure states:
- Low: subtle warnings, visual changes, comments from the guide
- Medium: more pointed warnings, quest suggestions, room mood darkens
- High: encounter event, harsher overnight update, optional rescue quest chain

### Boss encounter design

Boss encounters should be short, playful, and symbolic. They should never replace the real-life action requirement.

Examples:
- Tap-based mist clearing on screen
- Clicking clutter spots in a room
- Sealing pop-up cracks in a hallway
- Reconnecting broken wires in Robot's room
- Watering wilted plants before time runs out

These micro-events do not "solve" the boss alone. They frame the problem emotionally.

To truly weaken the boss, the player still completes the real task:
- walk
- job application
- sober day
- clean-up
- morning check-in

### Good rule

Boss encounter = symbolic resistance  
Real task completion = actual victory

## 10. Quest system

Quests replace generic labels with more game-like framing, while still mapping to real actions.

### Creature quests

- Wake the Body
- Eat Something Real
- Reset the Floor
- Survive the Day
- Take the Walk

### Cat quests

- Protect One Hour
- Close One Loop
- Clear the Desk
- Refuse the Noise
- Hold the Boundary

### Sweetheart quests

- Send the Application
- Face the Hard Thing
- Make the Ask
- Show Up Well
- Finish the Visible Thing

### Plant Spirit quests

- Water Yourself
- Tend the Room
- Rest Without Guilt
- Open the Window
- Bring Back Warmth

### Robot quests

- Sort the Queue
- Build the Plan
- Remove Friction
- Finish the Sequence
- Stabilize the System

### Quest generation rules

- Main priority sets the strongest weighting
- Custom tags add variants
- Chapter length affects quest count and difficulty
- Current boss pressure influences defensive quests
- Current room and bond state influence dialogue and flavor

## 11. Garden system

The Garden is open from the start.

### Garden rules

- Only unlocked residents appear there
- Residents can idle, react, or play there
- The player can get side quests there
- Companions can comment on each other there
- The Garden should become a visual reward space

### Garden functions

- Shared social hub
- Low-pressure quest board
- Bond scenes
- Group reactions after milestones
- Visual display of unlocked residents

## 12. Room design and visual progression

Each resident has one room. Each room has multiple states.

### Room layers

- Background wall
- Floor
- Large furniture
- Small props
- Resident layer
- Overlay layer
- Lighting layer
- Weather or particles

### Room state changes

- Cleaner surfaces
- Better lighting
- More lived-in warmth
- Functional props return
- Character-specific decorative upgrades

### Example room arcs

Creature room:
- Bare nest
- Warmer recovery corner
- Active, cozy den

Cat room:
- Tense desk nook
- Quiet focus room
- Elegant routine chamber

Sweetheart room:
- Faded self-image room
- Encouraging vanity and planning space
- Warm, confident results room

Plant Spirit room:
- Dry faded room
- Calm sunlit room
- Lush cozy sanctuary

Robot room:
- Broken maintenance station
- Organized control room
- Cheerful retro operations room

## 13. Animation direction

Animation scope must stay controlled.

### Core animation set

- Idle
- Blink
- Happy react
- Sad react
- Sleep
- One special action per resident
- Door knock
- Door unlock
- Room brighten
- Dust clear
- Achievement stamp
- Boss warning flicker
- Garden meetup cue

### Room progression animation style

- Color shift
- Lamp turns on
- Prop slides into place
- Dust puff
- Tiny sparkle
- Overlay change

The goal is atmosphere, not huge frame counts.

## 14. Audio direction

### Music

- Mansion hub loop
- One room loop per resident
- Morning loop
- Evening loop
- Boss tension loop
- Unlock sting

### Ambient sound ideas

- Floor creaks
- Wind in hallway
- Rain on window
- Lamp buzz
- Plant rustle
- Robot beeps
- Cat purr
- Tiny chime when vitality rises

Audio should do a lot of worldbuilding work so visuals do not need to carry everything alone.

## 15. AI role in Victoria

AI is optional support, not the foundation of the game.

### Handcrafted and local-first

- Scoring rules
- Quest generation logic
- Boss pressure logic
- Progression systems
- Room states
- Unlock conditions
- Basic daily briefings
- Companion reactions

### AI-enhanced

- Freeform companion chat
- Rewriting morning briefings in a more personal tone
- Turning journal text into structured quests
- Reflection summaries
- Suggesting custom tags from user text

### Principle

If AI vanished, Victoria should still be a good app.

## 16. Free and premium structure

### Free

- Whole mansion visible but mostly locked
- Creature as default starter
- Garden open from start
- Other residents only appear when unlocked
- Core local-first systems available

### Premium

- Free switching between guides
- All resident rooms accessible
- Extra floors or late-game wings
- Expanded mansion scenes
- More cosmetic and audio variety

## 17. Achievement philosophy

Achievements should reward recovery, not only perfection.

### Types

- First-step achievements
- Consistency achievements
- Courage achievements
- Comeback achievements
- Protection achievements
- House restoration achievements
- Character bond achievements

Examples:
- First Door Opened
- Three Calm Nights
- One Honest Application
- Back After a Bad Week
- No Drift Today
- The Garden Noticed You

## 18. Implementation guardrails

1. Keep current score and rule engine.
2. Add lore by interpretation, not by replacing systems.
3. Build one polished room flow first before expanding.
4. Prefer layered scenes over many unique assets.
5. Keep micro-events short and symbolic.
6. Always tie fantasy framing back to a real-life action.

## 19. Immediate planning next steps

1. Write mansion map and unlock order.
2. Write the first story arc for each resident.
3. Define score-to-boss mappings in detail.
4. Define chapter-end recap structure.
5. Define visual art bible: palette, line weight, scene size, overlays.
6. Define audio pack list.
7. Decide how premium unlocks are presented in-world.

## 20. Current agreed decisions

- Sweetheart lives on the first floor
- Garden is open from the start
- Unlocked residents always appear in the garden
- Creature starts as the default free guide
- Choosing Creature does not break lore
- Whole mansion is visible early but mostly locked
- Premium includes switching, full rooms, and later mansion wings
- Chapter lengths include 1, 3, 7, and 14 days
- The mansion should feel like a mystery mansion, not a generic apartment

