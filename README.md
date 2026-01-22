# TV-Insight - HbbTv Tracking Script

The repository contains TV-Insight HbbTv tracking script content templates.

## Folder structure
| Folder | Description |
|--------|-------------|
| `/src/` | Tv-Insight HbbTv tracking script content templates. (see [Files](#files)) |
| `/mock-hbbtv-application/` | Mock wrapper application with tracking script integration. |
| `/mock-session-application/` | Mock implementation of tracking backend system;for testing purposes. |

### Files

| File | Description |
|------|-------------|
| `iframe-loader.js` | Entry point script that loads tracking via iframe or direct script injection |
| `tracking.js` | Core tracking logic - heartbeats, session management, localStorage handling |
| `tracking-iframe.js` | PostMessage bridge for iframe mode communication |
| `new_session.js` | Handles session restart (via `start()` or `switchChannel()`) |
| `iframe.html` | HTML page loaded in iframe for cross-origin tracking |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     HbbTV Application                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   iframe-loader.js                      │    │
│  │  - Detects device capabilities                          │    │
│  │  - Creates API stub (queues calls)                      │    │
│  │  - Loads tracking via iframe OR direct script           │    │
│  │  - Sends channel metadata                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│              ┌─────────────┴─────────────┐                      │
│              ▼                           ▼                      │
│  ┌───────────────────────┐   ┌────────────────────────┐         │
│  │   Iframe Mode         │   │   Direct Script Mode   │         │
│  │   (Modern devices)    │   │   (Legacy devices)     │         │
│  │                       │   │                        │         │
│  │  ┌─────────────────┐  │   │  tracking.js loaded    │         │
│  │  │   iframe.html   │  │   │  directly into page    │         │
│  │  │  ┌───────────┐  │  │   │                        │         │
│  │  │  │tracking.js│  │  │   └────────────────────────┘         │
│  │  │  │tracking-  │  │  │                                      │
│  │  │  │iframe.js  │  │  │                                      │
│  │  │  └───────────┘  │  │                                      │
│  │  └─────────────────┘  │                                      │
│  │         ▲             │                                      │
│  │         │ postMessage │                                      │
│  │         ▼             │                                      │
│  │  Parent window API    │                                      │
│  └───────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

## API

The tracking script exposes the following API via `window.__hbb_tracking_tgt`:

### Methods

| Method | Description |
|--------|-------------|
| `getDID(callback)` | Get device ID |
| `getSID(callback)` | Get session ID |
| `stop(callback)` | Stop tracking |
| `start(callback, errorCallback)` | Start/restart tracking |
| `switchChannel(channelId, resolution, delivery, callback, errorCallback)` | Switch to different channel |
| `onLogEvent(callback)` | Register log event callback |

### Log Event Types

```javascript
{
  HB_REQUEST: 1,      // Heartbeat request sent
  HB_RESPONSE: 2,     // Heartbeat response received
  HB_ERROR: 3,        // Heartbeat error
  HB_BACKOFF: 4,      // Heartbeat in backoff mode
  SESSION_START: 5,   // Session started
  SESSION_STOP: 6,    // Session stopped
  SESSION_END_UPDATE_START: 7,  // Session end tracking started
  SESSION_END_UPDATE_STOP: 8,   // Session end tracking stopped
  SESSION_END_UPDATE: 9,        // Session end timestamp updated
  SESSION_END_SEND: 10          // Session end sent to backend
}
```

## Template Placeholders

The following placeholders are replaced at runtime by the backend:

| Placeholder | Description |
|-------------|-------------|
| `{{CID}}` | Channel ID |
| `{{RESOLUTION}}` | Resolution code (0-3) |
| `{{DELIVERY}}` | Delivery type code (0-10) |
| `{{DEVICE_ID}}` | Device identifier |
| `{{SESSION_ID}}` | Session identifier |
| `{{CONSENT}}` | Whether user has given consent (true/false) |
| `{{INITIALIZE_SUSPENDED}}` | Start in suspended mode (true/false) |
| `{{HEARTBEAT_URL}}` | Backend URL for heartbeats |
| `{{HEARTBEAT_INTERVAL}}` | Heartbeat interval in ms |
| `{{TRACKING_GLOBAL_OBJECT}}` | Global object name (default: `__hbb_tracking_tgt`) |

## Available scripts

`yarn dev` - Start up mock tracking script integration in a local browser

## Testing

### Testing with Minified Templates

By default, tests run against the source templates in `/src`. To test with minified templates from `/dist`:

1. First, build the minified templates:
   ```bash
   yarn minify
   ```

2. Run tests with the `USE_MINIFIED` environment variable:
   ```bash
   USE_MINIFIED=true yarn ci
   ```

3. Or start the dev server with minified templates:
   ```bash
   USE_MINIFIED=true yarn dev
   ```

The mock session application will automatically serve templates from `/dist` instead of `/src` when `USE_MINIFIED=true` is set.

## Documentation
https://docs.tv-insight.com/docs/hbbtv-tracking/hbbtv-tracking-script

## OIPF DAE Compliance

The implementation follows the OIPF DAE specification (Volume 5, Declarative Application Environment):

### Application Management APIs (Section 7.2)

- Uses `application/oipfApplicationManager` embedded object (Section 7.2.1)
- Calls `getOwnerApplication(document)` to get the Application object
- Accesses `ApplicationPrivateData.currentChannel` for channel information (Section 7.2.4)

### Channel Class Properties (Section 7.13.11.2)

The following Channel properties are collected for metadata:

| Property | Description |
|----------|-------------|
| `idType` | Type of channel (ID_DVB_*, ID_IPTV_*, etc.) |
| `ccid` | Unique identifier within OITF scope |
| `onid` | Original Network ID (DVB/ISDB) |
| `tsid` | Transport Stream ID (DVB/ISDB) |
| `sid` | Service ID (DVB/ISDB) |
| `nid` | Network ID (broadcaster extension) |
| `name` | Channel name |
| `isHD` | HD flag |

### Reference Documents

- [OIPF DAE Specification Volume 5](https://www.oipf.tv/web-spec/volume5.html)
- [HbbTV Developer Portal](https://developer.hbbtv.org/references/)

## Support
[support@tv-insight.com](email:support@tv-insight.com)
