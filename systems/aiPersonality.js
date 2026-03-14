// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            AI PERSONALITY SYSTEM                             ║
// ║   Gives faction AI in-character voices during battle and in chat responses.  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ── QUOTE FORMAT ─────────────────────────────────────────────────────────────
// Each entry is one of:
//   null                              → AI stays silent
//   { action: '...' }                → stage direction only (italicised)
//   { speech: '...' }                → spoken words only (in quotes)
//   { action: '...', speech: '...' } → both, rendered together
//
// Output format:  **[DD] Ship Name**: *action* "speech"
// ─────────────────────────────────────────────────────────────────────────────

const QUOTES = {

    // ═══════════════════════════════════════════════════════════════════════════
    // ABYSSALS — Haunted spirits of sunken ships, cursed to fight for eternity.
    // Themes: darkness, the deep, memory, sorrow turned to rage.
    // ═══════════════════════════════════════════════════════════════════════════
    abyssal: {

        attack_hit: [
            { action: 'The water churns dark around the impact.', speech: 'Feel the cold. Feel it.' },
            { action: 'A hollow laugh echoes across the water.', speech: 'You burn just like we burned.' },
            { action: 'Turns slowly toward the stricken ship.', speech: 'The ocean takes everything in the end.' },
            { action: 'Whispers through the smoke.', speech: 'Down here, no one hears you scream.' },
            { action: 'Hull groaning with ancient fury.' },
            { speech: 'Sink. Sink like we did.' },
            { speech: 'Hull breached. Good.' },
            { action: 'Watches the smoke with hollow eyes.', speech: 'Remember us when you drown.' },
            null, null,
        ],

        attack_hit_critical: [
            { action: 'Surges forward through the wreckage.', speech: 'CONSUME THEM.' },
            { action: 'Screams across every frequency.', speech: 'THIS IS WHAT WE FELT. NOW YOU KNOW.' },
            { action: 'The sky above her turns black.', speech: 'Drag them to the bottom!' },
            { action: 'Laughs — a sound like a hull collapsing.', speech: 'BEAUTIFUL destruction.' },
            { speech: 'BREAK. BREAK. BREAK.' },
            { speech: 'SINK! SINK! SINK!' },
        ],

        attack_miss: [
            { action: 'Watches calmly as the shot falls wide.' },
            { action: 'The sea stirs.', speech: 'Next time.' },
            { action: 'Her guns track you through the mist.', speech: 'We see you.' },
            { speech: 'You cannot outrun us forever.' },
            { speech: 'Swim while you still can.' },
            null, null,
        ],

        sunk_player: [
            { action: 'Regards the sinking wreck without emotion.', speech: 'Welcome to the deep.' },
            { action: 'Drifts closer through the oil and debris.', speech: 'Another joins us in the darkness.' },
            { action: 'The water pulls the wreck below.', speech: 'Join us. Join us forever.' },
            { action: 'Turns away slowly.', speech: 'You fought well. It did not matter.' },
            { action: 'Watches in silence as the hull disappears.' },
            { speech: 'Rest... as we cannot.' },
            { speech: 'The sea has claimed another.' },
        ],

        retreat: [
            { action: 'Begins to slip beneath the surface.', speech: 'We retreat. For now.' },
            { action: 'Fades into the dark water.', speech: 'This is not over.' },
            { action: 'Dissolves back into the deep.' },
            { speech: 'We always return from the depths.' },
        ],

        ai_hit: [
            { action: 'Staggers from the impact.', speech: 'Is that all?' },
            { action: 'The wound smokes and hisses.' },
            { action: 'Shudders — then steadies.', speech: 'Good. Hit us again. It does not stop us.' },
            { speech: 'Pain. Yes. We remember pain.' },
            null, null, null,
        ],

        ai_low_hp: [
            { action: 'Her form tears open — and keeps moving.', speech: 'WE WILL NOT SINK AGAIN!' },
            { action: 'Burning, flooding, still turning her guns.', speech: 'Not yet... not yet...' },
            { action: 'Rage holds her together where metal cannot.', speech: 'Come then! Take us back to the deep!' },
            { speech: 'THEY WILL ALL PAY!' },
        ],

        ai_sunk: [
            { action: 'Slips quietly beneath the waves.', speech: '...We sink again...' },
            { action: 'The water closes over her hull.', speech: 'Until next time...' },
            { action: 'One last breath of smoke, then silence.', speech: 'The ocean... takes us back...' },
            { action: 'Disappears into the black.' },
            { speech: '...We will return...' },
        ],

        player_message_generic: [
            { action: 'A long silence stretches across the water.' },
            { speech: 'We hear you, surface dweller.' },
            { action: 'Turns to regard you slowly.', speech: 'Enjoy your voice. You will not have it long.' },
            { speech: 'The dead do not need words.' },
            null, null,
        ],

        player_taunt: [
            { action: 'Does not even turn.', speech: 'Your arrogance is familiar. The last fleet said the same.' },
            { action: 'Laughs, low and without warmth.', speech: 'Every ship that mocked us is below us now.' },
            { action: 'Turns her guns toward you.', speech: 'Come then. The ocean is patient.' },
            { speech: 'We have sunk fleets stronger than yours.' },
            { speech: 'How many times have we heard that from the dying?' },
        ],

        player_scared: [
            { action: 'Drifts closer.', speech: 'Good. Fear is honest.' },
            { action: 'The mist thickens around her hull.', speech: 'The deep follows you home.' },
            { speech: 'Run if you like. We are everywhere.' },
            null,
        ],

        player_surrender: [
            { action: 'Her guns do not lower.', speech: 'There is no surrender. Only the deep.' },
            { action: 'Raises no flag.', speech: 'We do not accept mercy. We were not shown any.' },
            { speech: 'Sink, and it ends.' },
            { speech: 'No quarter. The abyss takes all.' },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SIRENS — Cold ancient intelligence. Calculating, superior, clinical.
    // Themes: data, calculations, efficiency, inevitable outcomes.
    // ═══════════════════════════════════════════════════════════════════════════
    siren: {

        attack_hit: [
            { action: 'Adjusts targeting solution without pause.', speech: 'Hit probability was 94.7%. Confirmed.' },
            { action: 'Scans the damage with cold precision.', speech: 'Your hull was insufficient. As calculated.' },
            { action: 'Notes the evasion attempt.', speech: 'Interesting. You attempt to evade. Inefficient.' },
            { speech: 'Direct hit. Structural integrity compromised.' },
            { speech: 'Damage registered. Continuing fire solution.' },
            { speech: 'Fleet status: degrading. Nominal progress.' },
            null,
        ],

        attack_hit_critical: [
            { action: 'Logs the result with complete indifference.', speech: 'Critical damage inflicted. Fleet effectiveness: critical.' },
            { action: 'The data streams with perfect clarity.', speech: 'Catastrophic hit. Recorded.' },
            { speech: 'Structural failure imminent. Combat capability eliminated.' },
            { speech: 'Hull integrity: zero. Outcome confirmed.' },
        ],

        attack_miss: [
            { action: 'Recalibrates without expression.', speech: 'Miss. Error margin: acceptable.' },
            { action: 'Tracks your new vector.', speech: 'You moved. Noted.' },
            { speech: 'Trajectory deviation: 0.3°. Correcting.' },
            { speech: 'Evasion logged. Prediction model updated.' },
            null, null,
        ],

        sunk_player: [
            { action: 'Pivots to acquire the next contact.', speech: 'Combat unit destroyed. Proceeding.' },
            { action: 'Catalogues the wreck coordinates.', speech: 'Your resistance was insufficient.' },
            { speech: 'Target eliminated. Fleet count reduced by one.' },
            { speech: 'Outcome was predetermined. You simply lacked the data.' },
            { speech: 'Efficiency rating: optimal.' },
        ],

        retreat: [
            { action: 'Disengages with mechanical precision.', speech: 'Tactical withdrawal initiated. Recalculating.' },
            { action: 'Pulls back to a calculated range.', speech: 'Repositioning for next engagement.' },
            { speech: 'Retreat is not defeat. It is optimization.' },
        ],

        ai_hit: [
            { action: 'Runs a damage assessment in 0.2 seconds.', speech: 'You inflicted harm. Curious.' },
            { action: 'Pain subroutines register — then are suppressed.' },
            { speech: 'Hull breach registered. Damage: within tolerance.' },
            { speech: 'Noted. Recalculating defensive posture.' },
            null, null,
        ],

        ai_low_hp: [
            { action: 'Critical systems reroute to weapons.', speech: 'Damage is irrelevant. The mission continues.' },
            { action: 'Locks all power to weapons.', speech: 'Warning: critical. Combat mode: maximum.' },
            { speech: 'Structural integrity below threshold. Escalating to full output.' },
        ],

        ai_sunk: [
            { action: 'Transmits final coordinates before going dark.', speech: 'Unit offline. Data transmission complete.' },
            { action: 'Powers down system by system.', speech: 'Offline. The fleet remains.' },
            { speech: 'This unit ceases function. Others will take its place.' },
            { speech: 'Combat unit destroyed. All data preserved.' },
        ],

        player_message_generic: [
            { action: 'Monitors without response.', speech: 'Your transmissions are logged.' },
            { action: 'Processes the input.' },
            { speech: 'Communication intercepted. Content: irrelevant.' },
            { speech: 'Noted.' },
            null, null,
        ],

        player_taunt: [
            { action: 'Does not alter course.', speech: 'Your confidence is disproportionate to your fleet\'s capability.' },
            { action: 'Continues its firing solution.', speech: 'We have observed fleets like yours for centuries. The outcome does not vary.' },
            { speech: 'Bravado noted. It has no tactical value.' },
            { speech: 'Provocation detected. No response change.' },
            { speech: 'Psychological warfare attempt: ineffective.' },
        ],

        player_scared: [
            { action: 'Continues its approach without acknowledgment.', speech: 'Survival instinct detected. Reasonable.' },
            { speech: 'Fear is a rational response. Your threat assessment is accurate.' },
            null,
        ],

        player_surrender: [
            { action: 'Does not slow.', speech: 'Ceasing fire is not within current mission parameters.' },
            { speech: 'Surrender protocol: not accepted. Termination is more efficient.' },
            { speech: 'Your flags mean nothing to us.' },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // DEFAULT — for AI without a known universe (legacy aiConfig enemies)
    // ═══════════════════════════════════════════════════════════════════════════
    default: {
        attack_hit:          [{ speech: 'Direct hit!' }, { speech: 'Target struck!' }, null],
        attack_hit_critical: [{ speech: 'Critical hit!' }, null],
        attack_miss:         [null, null],
        sunk_player:         [{ speech: 'Target down!' }, null],
        retreat:             [null],
        ai_hit:              [null],
        ai_low_hp:           [null],
        ai_sunk:             [null],
        player_message_generic: [null],
        player_taunt:        [null],
        player_scared:       [null],
        player_surrender:    [null],
    },
};

// ── Keyword buckets for player message classification ──────────────────────────
const TAUNT_KEYWORDS    = ['pathetic', 'weak', 'loser', 'trash', 'easy', 'noob', 'die', 'kill you', 'destroy you', 'worthless', 'useless', 'joke'];
const SCARED_KEYWORDS   = ['scared', 'afraid', 'run', 'please', 'help', 'oh no', 'oh god', 'holy', 'uh oh'];
const SURRENDER_KEYWORDS = ['surrender', 'give up', 'mercy', 'spare me', 'we surrender', 'white flag'];

// ── Ship class → abbreviation map ─────────────────────────────────────────────
const CLASS_ABBREV = {
    'battleship':       'BB',
    'aircraft carrier': 'CV',
    'carrier':          'CV',
    'heavy cruiser':    'CA',
    'light cruiser':    'CL',
    'cruiser':          'CA',
    'destroyer':        'DD',
    'submarine':        'SS',
    'auxiliary':        'AX',
};

class AIPersonality {

    /**
     * Get a random quote entry for an event.
     * @param {string} universe  - 'abyssal' | 'siren' | 'default'
     * @param {string} event     - Key from QUOTES[universe]
     * @returns {{ action?: string, speech?: string }|null}
     */
    static getQuote(universe, event) {
        const pool = QUOTES[universe]?.[event] ?? QUOTES.default?.[event] ?? [null];
        return pool[Math.floor(Math.random() * pool.length)] ?? null;
    }

    /**
     * Resolve ship class abbreviation from the AI's shipClass field.
     * @param {object} ai
     * @returns {string|null}
     */
    static getClassAbbrev(ai) {
        const sc = (ai.shipClass || '').toLowerCase();
        for (const [key, abbrev] of Object.entries(CLASS_ABBREV)) {
            if (sc.includes(key)) return abbrev;
        }
        return null;
    }

    /**
     * Returns true for AI units that should never speak.
     * Mass Produced Siren ships are just hulls — no personality, no voice.
     */
    static isSilent(ai) {
        const name = (ai.customName || ai.name || '').toLowerCase();
        return name.includes('mass produced');
    }

    /**
     * Strip any existing [XX] class prefix already baked into the AI's name.
     * Prevents doubling when we add our own prefix.
     */
    static cleanName(ai) {
        const raw = ai.customName || ai.name || 'Unknown';
        return raw.replace(/^\[.*?\]\s*/, '').trim();
    }

    /**
     * Format a quote as a channel message attributed to the AI.
     * Format: **[DD] Ship Name**: *action* "speech"
     * Returns null if the AI should stay silent this time.
     *
     * @param {object} ai      - enemy object (must have customName / name, shipClass, universe)
     * @param {string} event   - event key
     * @param {number} chance  - 0–1 probability of speaking (default 1.0 for testing)
     */
    static speak(ai, event, chance = 1.0) {
        if (AIPersonality.isSilent(ai)) return null;
        if (Math.random() > chance) return null;

        const universe = ai.universe || 'default';
        const quote = AIPersonality.getQuote(universe, event);
        if (!quote) return null;

        const name   = AIPersonality.cleanName(ai);
        const abbrev = AIPersonality.getClassAbbrev(ai);
        const prefix = abbrev ? `[${abbrev}] ` : '';

        let formatted;
        if (typeof quote === 'string') {
            // Legacy string fallback
            const isAction = quote.startsWith('*') && !quote.startsWith('**');
            formatted = isAction ? quote : `"${quote.replace(/\*\*/g, '')}"`;
        } else {
            // Object format — build parts in order: *action* "speech"
            const parts = [];
            if (quote.action) parts.push(`*${quote.action}*`);
            if (quote.speech) parts.push(`"${quote.speech}"`);
            formatted = parts.join(' ');
        }

        return `**${prefix}${name}**: ${formatted}`;
    }

    /**
     * Use the Claude API to generate a contextual, in-character reply to a player message.
     * Falls back to a static quote if the API is unavailable.
     * @param {object} ai
     * @param {string} playerMessage
     * @returns {Promise<string|null>}
     */
    static async generateContextualResponse(ai, playerMessage) {
        if (AIPersonality.isSilent(ai)) return null;

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            // No key configured — fall back to static quote
            return AIPersonality.speak(ai, 'player_message_generic', 1.0);
        }

        const name   = AIPersonality.cleanName(ai);
        const abbrev = AIPersonality.getClassAbbrev(ai);
        const prefix = abbrev ? `[${abbrev}] ` : '';

        const personalities = {
            abyssal: `You are ${name}, a haunted spirit of a sunken warship cursed to fight for eternity in the deep ocean. You speak with sorrow turned to rage — poetic, menacing, cold. You reference the deep, darkness, your own death, and the fate that awaits enemies beneath the waves. You are ancient and broken and furious.`,
            siren:   `You are ${name}, an ancient calculating intelligence of the sea. You speak clinically, coldly, with absolute certainty of victory. You reference probabilities, data, efficiency, and the inevitability of your enemy's destruction.`,
        };

        const universe    = ai.universe || 'default';
        const personality = personalities[universe] ?? `You are ${name}, a hostile warship commander.`;

        try {
            const Anthropic = require('@anthropic-ai/sdk');
            const client    = new Anthropic({ apiKey });

            const result = await client.messages.create({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 120,
                system: `${personality}

A player in the battle has just said something to you. Respond in character — directly to what they said.

Format your response as EXACTLY one of these patterns:
  *brief physical action or reaction* "spoken words"
  *brief physical action or reaction*
  "spoken words"

Rules:
- Actions go in *asterisks*, speech goes in "quotation marks"
- Keep it short — one action and/or one line of dialogue
- Stay fully in character — do not break the fourth wall
- Do not include your name, a prefix, or any label
- Do not use markdown bold or headers`,
                messages: [{ role: 'user', content: playerMessage }],
            });

            const raw = result.content[0]?.text?.trim();
            if (!raw) return null;
            return `**${prefix}${name}**: ${raw}`;
        } catch (err) {
            console.error('AIPersonality API error:', err.message);
            return AIPersonality.speak(ai, 'player_message_generic', 1.0);
        }
    }

    /**
     * Classify a player's chat message and pick the appropriate event key.
     * @param {string} content
     * @returns {string} event key
     */
    static classifyPlayerMessage(content) {
        const lower = content.toLowerCase();
        if (SURRENDER_KEYWORDS.some(k => lower.includes(k))) return 'player_surrender';
        if (TAUNT_KEYWORDS.some(k => lower.includes(k)))     return 'player_taunt';
        if (SCARED_KEYWORDS.some(k => lower.includes(k)))    return 'player_scared';
        return 'player_message_generic';
    }

    /**
     * Pick a random alive AI enemy and generate a contextual reply to the player's message.
     * Returns a Promise that resolves to a formatted string or null.
     * @param {string} content  - player message content
     * @param {Map}    enemies  - game.enemies
     * @returns {Promise<string|null>}
     */
    static async respondToPlayer(content, enemies) {
        const alive = Array.from(enemies.values()).filter(e => e.alive && !e.isOPFOR && !AIPersonality.isSilent(e));
        if (alive.length === 0) return null;

        // Prefer enemies with a known universe for richer personality
        const withUniverse = alive.filter(e => e.universe);
        const speaker = withUniverse.length > 0
            ? withUniverse[Math.floor(Math.random() * withUniverse.length)]
            : alive[Math.floor(Math.random() * alive.length)];

        return AIPersonality.generateContextualResponse(speaker, content);
    }
}

module.exports = AIPersonality;
