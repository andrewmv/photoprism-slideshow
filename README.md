# PhotoPrism Slideshow

A lightweight, cross-platform slideshow web app for displaying photos from your PhotoPrism instance. Features automatic updates when new photos are added, configurable slide duration, and full-screen support.

## Features

- 🖼️ **Full-screen slideshow** - Displays photos one at a time in full-screen mode
- 🔄 **Auto-update** - Automatically detects and adds new photos to the rotation
- ⚙️ **Configurable duration** - Set how long each photo is displayed (1-60 seconds)
- 🎲 **Shuffle mode** - Randomize photo order
- 📱 **Cross-platform** - Works on iOS, Android, PC, and tablets
- 🎨 **Lightweight** - Vanilla JavaScript frontend, minimal dependencies
- 🔐 **Secure** - Proxies PhotoPrism API requests with authentication

## Prerequisites

- Node.js (v14 or higher)
- PhotoPrism instance running and accessible
- PhotoPrism access token (app password or session token)

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Edit `.env` and configure your PhotoPrism settings:
```env
PHOTOPRISM_URL=http://localhost:2342
PHOTOPRISM_TOKEN=your_access_token_here
PORT=3000
```

## Getting a PhotoPrism Access Token

You can obtain an access token in one of the following ways:

1. **App Password** (Recommended):
   - Go to PhotoPrism Settings → Account → Apps & Devices
   - Create a new app password
   - Use this as your `PHOTOPRISM_TOKEN`

2. **Session Token**:
   - Log into PhotoPrism in your browser
   - Open browser developer tools → Network tab
   - Make a request to PhotoPrism API
   - Copy the `X-Auth-Token` header value
   - Use this as your `PHOTOPRISM_TOKEN`

3. **Command Line**:
   ```bash
   photoprism auth add -n slideshow
   ```
   Copy the generated token to your `.env` file

## Running the App

Start the server:
```bash
npm start
```

The slideshow will be available at `http://localhost:3000`

Open this URL in any modern web browser on your device (iOS, Android, PC, etc.).

## Usage

### Controls

- **Settings Button (⚙️)**: Open settings panel
- **Fullscreen Button (⛶)**: Toggle fullscreen mode
- **Keyboard Shortcuts**:
  - `F` - Toggle fullscreen
  - `S` - Open/close settings
  - `ESC` - Close settings

### Settings

- **Slide Duration**: How long each photo is displayed (1-60 seconds)
- **Update Check Interval**: How often to check for new photos (10-300 seconds)
- **Shuffle Photos**: Randomize the order of photos
- **Refresh Photos Now**: Manually reload photos from PhotoPrism

### Mobile Gestures

- **Swipe Right**: Open settings panel

## Configuration

### Environment Variables

- `PHOTOPRISM_URL` - Your PhotoPrism instance URL (default: `http://localhost:2342`)
- `PHOTOPRISM_TOKEN` - Your PhotoPrism access token (required)
- `PORT` - Port for the slideshow server (default: `3000`)

### Image Quality

The app uses PhotoPrism's `fit_1920` thumbnail size by default, which provides good quality for most displays. To change this, edit `public/app.js` and modify the `getImageUrl()` function:

```javascript
getImageUrl(hash) {
    // Options: fit_1920, fit_2560, fit_3840, fit_4096
    return `/api/v1/t/${hash}/${this.previewToken}/fit_1920`;
}
```

## Architecture

- **Backend**: Express.js server that proxies PhotoPrism API requests
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework dependencies)
- **Auto-update**: Polls PhotoPrism API at configurable intervals
- **Image Loading**: Preloads next image for smooth transitions

## Troubleshooting

### Photos not loading

1. Check that your PhotoPrism URL is correct and accessible
2. Verify your access token is valid
3. Check browser console for error messages
4. Ensure PhotoPrism has indexed your photos

### CORS errors

The backend includes CORS middleware. If you still see CORS errors, ensure:
- The backend server is running
- You're accessing the app through the backend URL (not opening HTML directly)

### Images not updating

- Check the "Update Check Interval" setting
- Use "Refresh Photos Now" button to manually refresh
- Verify PhotoPrism has indexed new photos

## Development

The app uses:
- **Backend**: Express.js, node-fetch, cors, dotenv
- **Frontend**: Vanilla JavaScript, modern CSS

No build step required - just edit the files and restart the server.

## License

MIT
