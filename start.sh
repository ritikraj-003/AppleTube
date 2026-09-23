#!/usr/bin/env bash
# AppleTube - Quick Launch & Live YouTube Server Script

PORT=3000
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo "========================================================"
echo "🎵 AppleTube — Live Music & Android Background Audio"
echo "========================================================"
echo "💻 Computer Browser:  http://localhost:$PORT"
if [ "$IP" != "localhost" ]; then
echo "📱 Android Phone:     http://$IP:$PORT"
echo "👉 Open the Android Phone URL in Chrome to install AppleTube!"
fi
echo "========================================================"

# Auto-open browser on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  (sleep 1 && open "http://localhost:$PORT") &
fi

# Run live YouTube server bound to 0.0.0.0
python3 server.py $PORT
