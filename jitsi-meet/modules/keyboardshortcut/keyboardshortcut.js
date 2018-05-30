/* global APP, $, interfaceConfig */

import { toggleDialog } from '../../react/features/base/dialog';
import {
    SHORTCUT_HELP,
    SHORTCUT_SPEAKER_STATS_CLICKED,
    SHORTCUT_TALK_CLICKED,
    SHORTCUT_TALK_RELEASED,
    sendAnalyticsEvent
} from '../../react/features/analytics';
import { KeyboardShortcutsDialog }
    from '../../react/features/keyboard-shortcuts';
import { SpeakerStats } from '../../react/features/speaker-stats';

const logger = require('jitsi-meet-logger').getLogger(__filename);

/**
 * Map of shortcuts. When a shortcut is registered it enters the mapping.
 * @type {{}}
 */
const _shortcuts = {};

/**
 * Map of registered keyboard keys and translation keys describing the
 * action performed by the key.
 * @type {Map}
 */
const _shortcutsHelp = new Map();

/**
 * True if the keyboard shortcuts are enabled and false if not.
 * @type {boolean}
 */
let enabled = true;

/**
 * Maps keycode to character, id of popover for given function and function.
 */
const KeyboardShortcut = {
    init() {
        this._initGlobalShortcuts();

        window.onkeyup = e => {
            if (!enabled) {
                return;
            }
            const key = this._getKeyboardKey(e).toUpperCase();
            const num = parseInt(key, 10);

            if (!($(':focus').is('input[type=text]')
                || $(':focus').is('input[type=password]')
                || $(':focus').is('textarea'))) {
                if (_shortcuts.hasOwnProperty(key)) {
                    _shortcuts[key].function(e);
                } else if (!isNaN(num) && num >= 0 && num <= 9) {
                    APP.UI.clickOnVideo(num);
                }

            // esc while the smileys are visible hides them
            } else if (key === 'ESCAPE'
                && $('#smileysContainer').is(':visible')) {
                APP.UI.toggleSmileys();
            }
        };

        window.onkeydown = e => {
            if (!enabled) {
                return;
            }
            if (!($(':focus').is('input[type=text]')
                || $(':focus').is('input[type=password]')
                || $(':focus').is('textarea'))) {
                if (this._getKeyboardKey(e).toUpperCase() === ' ') {
                    if (APP.conference.isLocalAudioMuted()) {
                        sendAnalyticsEvent(SHORTCUT_TALK_RELEASED);
                        logger.log('Talk shortcut released');
                        APP.conference.muteAudio(false);
                    }
                }
            }
        };
    },

    /**
     * Enables/Disables the keyboard shortcuts.
     * @param {boolean} value - the new value.
     */
    enable(value) {
        enabled = value;
    },

    /**
     * Registers a new shortcut.
     *
     * @param shortcutChar the shortcut character triggering the action
     * @param shortcutAttr the "shortcut" html element attribute mappring an
     * element to this shortcut and used to show the shortcut character on the
     * element tooltip
     * @param exec the function to be executed when the shortcut is pressed
     * @param helpDescription the description of the shortcut that would appear
     * in the help menu
     */
    registerShortcut(// eslint-disable-line max-params
            shortcutChar,
            shortcutAttr,
            exec,
            helpDescription) {
        _shortcuts[shortcutChar] = {
            character: shortcutChar,
            shortcutAttr,
            function: exec
        };

        if (helpDescription) {
            this._addShortcutToHelp(shortcutChar, helpDescription);
        }
    },

    /**
     * Unregisters a shortcut.
     *
     * @param shortcutChar unregisters the given shortcut, which means it will
     * no longer be usable
     */
    unregisterShortcut(shortcutChar) {
        _shortcuts.remove(shortcutChar);
        _shortcutsHelp.delete(shortcutChar);
    },

    /**
     * @param e a KeyboardEvent
     * @returns {string} e.key or something close if not supported
     */
    _getKeyboardKey(e) {
        if (typeof e.key === 'string') {
            return e.key;
        }
        if (e.type === 'keypress'
                && ((e.which >= 32 && e.which <= 126)
                    || (e.which >= 160 && e.which <= 255))) {
            return String.fromCharCode(e.which);
        }

        // try to fallback (0-9A-Za-z and QWERTY keyboard)
        switch (e.which) {
        case 27:
            return 'Escape';
        case 191:
            return e.shiftKey ? '?' : '/';
        }
        if (e.shiftKey || e.type === 'keypress') {
            return String.fromCharCode(e.which);
        }

        return String.fromCharCode(e.which).toLowerCase();

    },

    /**
     * Adds the given shortcut to the help dialog.
     *
     * @param shortcutChar the shortcut character
     * @param shortcutDescriptionKey the description of the shortcut
     * @private
     */
    _addShortcutToHelp(shortcutChar, shortcutDescriptionKey) {
        _shortcutsHelp.set(shortcutChar, shortcutDescriptionKey);
    },

    /**
     * Initialise global shortcuts.
     * Global shortcuts are shortcuts for features that don't have a button or
     * link associated with the action. In other words they represent actions
     * triggered _only_ with a shortcut.
     */
    _initGlobalShortcuts() {
        this.registerShortcut('?', null, () => {
            sendAnalyticsEvent(SHORTCUT_HELP);
            APP.store.dispatch(toggleDialog(KeyboardShortcutsDialog, {
                shortcutDescriptions: _shortcutsHelp
            }));
        }, 'keyboardShortcuts.toggleShortcuts');

        // register SPACE shortcut in two steps to insure visibility of help
        // message
        this.registerShortcut(' ', null, () => {
            sendAnalyticsEvent(SHORTCUT_TALK_CLICKED);
            logger.log('Talk shortcut pressed');
            APP.conference.muteAudio(true);
        });
        this._addShortcutToHelp('SPACE', 'keyboardShortcuts.pushToTalk');

        if (!interfaceConfig.filmStripOnly) {
            this.registerShortcut('T', null, () => {
                sendAnalyticsEvent(SHORTCUT_SPEAKER_STATS_CLICKED);
                APP.store.dispatch(toggleDialog(SpeakerStats, {
                    conference: APP.conference
                }));
            }, 'keyboardShortcuts.showSpeakerStats');
        }

        /**
         * FIXME: Currently focus keys are directly implemented below in
         * onkeyup. They should be moved to the SmallVideo instead.
         */
        this._addShortcutToHelp('0', 'keyboardShortcuts.focusLocal');
        this._addShortcutToHelp('1-9', 'keyboardShortcuts.focusRemote');
    }
};

export default KeyboardShortcut;