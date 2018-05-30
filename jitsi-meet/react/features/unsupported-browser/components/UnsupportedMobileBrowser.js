/* @flow */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { translate, translateToHTML } from '../../base/i18n';
import { Platform } from '../../base/react';

import HideNotificationBarStyle from './HideNotificationBarStyle';

declare var interfaceConfig: Object;

/**
 * The namespace of the CSS styles of UnsupportedMobileBrowser.
 *
 * @private
 * @type {string}
 */
const _SNS = 'unsupported-mobile-browser';

/**
 * The namespace of the i18n/translation keys of UnsupportedMobileBrowser.
 *
 * @private
 * @type {string}
 */
const _TNS = 'unsupportedBrowser';

/**
 * The map of platforms to URLs at which the mobile app for the associated
 * platform is available for download.
 *
 * @private
 * @type {Array<string>}
 */
const _URLS = {
    android: interfaceConfig.MOBILE_DOWNLOAD_LINK_ANDROID
        || 'https://play.google.com/store/apps/details?id=org.jitsi.meet',
    ios: interfaceConfig.MOBILE_DOWNLOAD_LINK_IOS
        || 'https://itunes.apple.com/us/app/jitsi-meet/id1165103905'
};

/**
 * React component representing mobile browser page.
 *
 * @class UnsupportedMobileBrowser
 */
class UnsupportedMobileBrowser extends Component<*, *> {
    state: Object;

    /**
     * UnsupportedMobileBrowser component's property types.
     *
     * @static
     */
    static propTypes = {
        /**
         * The function to translate human-readable text.
         *
         * @public
         * @type {Function}
         */
        t: PropTypes.func
    };

    /**
     * Initializes the text and URL of the `Start a conference` / `Join the
     * conversation` button which takes the user to the mobile app.
     *
     * @inheritdoc
     */
    componentWillMount() {
        // If the user installed the app while this Component was displayed
        // (e.g. the user clicked the Download the App button), then we would
        // like to open the current URL in the mobile app. The only way to do it
        // appears to be a link with an app-specific scheme, not a Universal
        // Link.
        const appScheme = interfaceConfig.MOBILE_APP_SCHEME || 'org.jitsi.meet';
        const joinURL = `${appScheme}:${window.location.href}`;

        this.setState({
            joinURL
        });
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { t } = this.props;

        const openAppButtonClassName
            = `${_SNS}__button ${_SNS}__button_primary`;
        const appName
            = interfaceConfig.ADD_PEOPLE_APP_NAME || interfaceConfig.APP_NAME;

        return (
            <div className = { _SNS }>
                <div className = { `${_SNS}__body` }>
                    <img
                        className = { `${_SNS}__logo` }
                        src = 'images/logo-blue.svg' />
                    <p className = { `${_SNS}__text` }>
                        {
                            translateToHTML(
                                t,
                                `${_TNS}.appNotInstalled`,
                                { app: appName })
                        }
                    </p>
                    <a href = { this.state.joinURL }>
                        <button className = { openAppButtonClassName }>
                            { t(`${_TNS}.openApp`,
                                { app: appName }) }
                        </button>
                    </a>
                    <a href = { _URLS[Platform.OS] }>
                        <button className = { `${_SNS}__button` }>
                            { t(`${_TNS}.downloadApp`) }
                        </button>
                    </a>
                </div>

                <HideNotificationBarStyle />
            </div>
        );
    }
}

export default translate(UnsupportedMobileBrowser);
