# Naval Command - New Step-by-Step Setup Flow

The `/prepare` command has been completely redesigned to provide a guided, step-by-step battle setup experience.

## Overview

Instead of showing all configuration options at once, the setup now progresses through distinct steps:

1. **Enemy Configuration** - Choose AI enemies
2. **Map Configuration** - Select battlefield type
3. **Mission Objectives** - Pick primary goal
4. **Setup Summary** - Review and finalize

## Step-by-Step Process

### Step 1: Enemy Configuration
- **No AI Enemies** - Pure PvP battle
- **3 Random Enemies** - Balanced AI opponents
- **5 Random Enemies** - More challenging battle
- **Custom Setup** - Choose specific enemy types (basic implementation)

### Step 2: Map Configuration
- **Random Generated Map** - Procedural terrain with islands and reefs
- **Custom Map** - Future feature (disabled)
- **← Back to Enemies** - Return to previous step

### Step 3: Mission Objectives
- Dynamic list of all available objectives from missions.js
- Each objective shows rewards (XP and currency)
- **← Back to Map** - Return to previous step

### Step 4: Setup Summary & Finalization
- Shows complete configuration summary
- **✅ Start Setup Complete!** - Finalize and announce to channel
- **🤖 Edit Enemies** - Return to enemy configuration
- **🗺️ Edit Map** - Return to map configuration
- **🎯 Edit Objective** - Return to objective selection

## Key Features

### ✅ **Navigation**
- Back buttons to return to previous steps
- Edit buttons to modify any configuration after completion
- Clear step indicators (Step X of 3)

### ✅ **Visual Design**
- Each step has unique colors:
  - Enemy Config: Orange (`0xFF6B35`)
  - Map Config: Teal (`0x4ECDC4`)
  - Objectives: Purple (`0x9B59B6`)
  - Summary: Green (`0x2ECC71`)

### ✅ **Progress Tracking**
- Shows confirmed settings from previous steps
- Clear "✅" checkmarks for completed configurations
- Current step highlighted in description

### ✅ **Error Handling**
- GM-only access verification
- Graceful error recovery
- Clear error messages

## Implementation Details

### Button ID Patterns
- `setup_enemy_{TYPE}_{userId}` - Enemy configuration
- `setup_map_{TYPE}_{userId}` - Map configuration
- `setup_objective_{OBJECTIVE_TYPE}_{userId}` - Objective selection
- `setup_back_{STEP}_{userId}` - Navigation buttons
- `setup_complete_{userId}` - Finalize setup
- `setup_edit_{TARGET}_{userId}` - Edit buttons

### Game State Tracking
```javascript
game.setupState = {
    currentStep: 'enemies|map|objectives',
    enemyConfig: { type: 'preset|custom', count: number, ... },
    mapConfig: { type: 'random|custom' },
    objectiveConfig: { type: string, name: string },
    setupComplete: boolean,
    maxPlayers: number
}
```

### Flow Control
1. `/prepare` → `showEnemyConfigurationStep()`
2. Enemy selection → `showMapConfigurationStep()`
3. Map selection → `showMissionObjectivesStep()`
4. Objective selection → `showSetupSummaryStep()`
5. Complete → Public announcement + enable `/join`

## Benefits

### **For Game Masters**
- Easier setup process with clear guidance
- Ability to review and modify any setting
- Better understanding of configuration options
- Visual confirmation of all settings

### **For Players**
- Clear setup progress visibility
- Understanding of battle parameters before joining
- Public announcement when setup is complete

### **For Development**
- Modular setup components
- Easy to add new configuration steps
- Separated old and new setup handling
- Maintained backward compatibility

## Usage

1. GM runs `/prepare` command
2. Follows step-by-step prompts
3. Can navigate back/forth between steps
4. Reviews final summary
5. Clicks "✅ Start Setup Complete!"
6. Public message announces battle is ready
7. Players use `/join` to enter
8. GM uses `/start` to begin battle

The system maintains all existing functionality while providing a much more intuitive and guided setup experience.