# Native iOS checks

Run `npm run test:ios` with Node.js 18 or newer. On macOS with Xcode, the tests
compile the native model implementations for an iOS 16 deployment target without
a prefix header. The main-thread guard is also checked on other platforms.

To syntax-check the complete plugin against an installed Cordova iOS SDK:

```sh
CORDOVA_IOS_HEADERS=/path/to/cordova-ios/CordovaLib/include npm run test:ios
```

These checks do not replace testing immediate updates, cached startup, and
background/resume in a signed Cordova app. No JavaScript API, Android source,
deployment configuration, or package version is changed by the native fixes.
