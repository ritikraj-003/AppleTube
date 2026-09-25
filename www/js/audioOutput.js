/**
 * AppleTube - Mobile Audio Output / Connect to Device Manager
 * Integrates HTMLMediaElement.setSinkId and Audio Output Devices API.
 * Premium Spotify-style glassmorphic device picker with dynamic artwork theme matching.
 */

import { UIManager } from './ui.js';

export class AudioOutputManager {
  constructor(player) {
    this.player = player;
    this.modal = null;
    this.card = null;
    this.deviceListEl = null;
    this.statusMsgEl = null;
    this.triggerBtn = null;
    this.closeBtn = null;
    this.isOpen = false;
    this.isClosing = false;
    this.activeSinkId = '';
    this.currentThemeColors = null;
    this.hasSetSinkId = typeof HTMLMediaElement !== 'undefined' && typeof HTMLMediaElement.prototype.setSinkId === 'function';
  }

  init() {
    this.modal = document.getElementById('audioOutputModal');
    this.card = document.getElementById('audioOutputCard');
    this.deviceListEl = document.getElementById('audioOutputDeviceList');
    this.statusMsgEl = document.getElementById('audioOutputStatusMsg');
    this.triggerBtn = document.getElementById('btnFullscreenAudioOutput') || document.getElementById('btnFullscreenAirplay');
    this.closeBtn = document.getElementById('btnCloseAudioOutputModal');

    if (!this.modal) return;

    if (this.triggerBtn) {
      this.triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.open();
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    // Light dismiss: click on backdrop outside card
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Listen for device changes (e.g. Bluetooth headphones connected/disconnected)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      try {
        navigator.mediaDevices.addEventListener('devicechange', () => {
          if (this.isOpen) {
            this.refreshDevices();
          }
        });
      } catch (e) {
        console.warn('[AudioOutput] devicechange listener not supported:', e);
      }
    }
  }

  async open() {
    // Only available on mobile screen size (<= 960px)
    if (window.innerWidth > 960) return;
    if (this.isClosing) return;

    this.isOpen = true;
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');

    // Trigger smooth glass appearance animation
    requestAnimationFrame(() => {
      if (this.card) {
        this.card.classList.add('visible');
      }
    });

    await this.refreshDevices();
  }

  close() {
    if (!this.isOpen || this.isClosing) return;
    this.isClosing = true;

    if (this.card) {
      this.card.classList.remove('visible');
    }

    setTimeout(() => {
      if (this.modal) {
        this.modal.classList.remove('open');
        this.modal.setAttribute('aria-hidden', 'true');
      }
      this.isOpen = false;
      this.isClosing = false;
    }, 280);
  }

  updateTheme(colors) {
    this.currentThemeColors = colors;
    if (!colors) return;

    const accent = colors.primary || 'hsl(38, 92%, 56%)';
    const glow = colors.glow || 'hsla(38, 92%, 56%, 0.42)';
    const glowSoft = colors.glowSoft || 'hsla(38, 92%, 56%, 0.16)';

    if (this.triggerBtn) {
      this.triggerBtn.style.setProperty('--timeline-accent', accent);
      this.triggerBtn.style.setProperty('--timeline-accent-glow', glow);
      this.triggerBtn.style.setProperty('--timeline-accent-glow-subtle', glowSoft);
    }

    if (this.card) {
      this.card.style.setProperty('--timeline-accent', accent);
      this.card.style.setProperty('--timeline-accent-glow', glow);
      this.card.style.setProperty('--timeline-accent-glow-subtle', glowSoft);
    }
  }

  async refreshDevices() {
    if (!this.deviceListEl) return;

    const hasEnumerate = typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function';
    this.hasSetSinkId = typeof HTMLMediaElement !== 'undefined' && typeof HTMLMediaElement.prototype.setSinkId === 'function';

    const currentSink = (this.player && this.player.audio && typeof this.player.audio.sinkId === 'string')
      ? this.player.audio.sinkId
      : this.activeSinkId;

    let deviceList = [];
    let detectedOutputsCount = 0;

    if (hasEnumerate) {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = allDevices.filter(d => d.kind === 'audiooutput');
        detectedOutputsCount = audioOutputs.length;

        if (audioOutputs.length > 0) {
          deviceList = audioOutputs.map((d, index) => {
            const rawLabel = (d.label || '').trim();
            const isDefault = d.deviceId === 'default' || !d.deviceId;

            let name = rawLabel;
            let subtitle = 'Available';
            let type = 'speaker';

            if (!name) {
              if (isDefault) {
                name = 'This phone';
                subtitle = 'Phone speaker';
                type = 'phone';
              } else {
                name = `Audio Output ${index + 1}`;
                subtitle = 'External output';
                type = 'speaker';
              }
            } else {
              const lower = name.toLowerCase();
              if (/bluetooth|airpod|buds|headphone|headset|earphone|wireless/i.test(lower)) {
                type = 'headphones';
                subtitle = 'Bluetooth audio';
              } else if (/speaker|soundbar|tv|display/i.test(lower)) {
                type = 'speaker';
                subtitle = 'External speaker';
              } else if (/default|built-in|internal|speakerphone|phone/i.test(lower) || isDefault) {
                type = 'phone';
                subtitle = 'Phone speaker';
                if (/internal|built-in|default/i.test(name)) {
                  name = 'This phone';
                }
              } else {
                type = 'other';
                subtitle = 'Audio device';
              }
            }

            const isActive = isDefault
              ? (!currentSink || currentSink === 'default' || currentSink === '')
              : (currentSink === d.deviceId);

            if (isActive) {
              subtitle = 'Connected';
            }

            return {
              deviceId: d.deviceId,
              name,
              subtitle,
              type,
              isActive
            };
          });
        }
      } catch (err) {
        console.warn('[AudioOutput] Error enumerating devices:', err);
      }
    }

    // If no devices were returned from the platform or labels are empty,
    // show the active phone speaker output as the real default
    if (deviceList.length === 0) {
      deviceList.push({
        deviceId: 'default',
        name: 'This phone',
        subtitle: 'Phone speaker',
        type: 'phone',
        isActive: true
      });
    }

    // Always sort so active/current device appears first!
    deviceList.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

    // Render device list items
    this.renderDeviceList(deviceList);

    // Update footer status message
    if (this.statusMsgEl) {
      if (this.hasSetSinkId && detectedOutputsCount > 1) {
        this.statusMsgEl.textContent = 'Audio Output API active · Platform routing supported';
      } else {
        this.statusMsgEl.textContent = 'Audio output managed by device system settings';
      }
    }
  }

  getDeviceIconSvg(type) {
    if (type === 'headphones') {
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
        </svg>
      `;
    }
    if (type === 'speaker') {
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      `;
    }
    // Default: phone icon
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
        <line x1="12" y1="18" x2="12.01" y2="18"></line>
      </svg>
    `;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderDeviceList(devices) {
    if (!this.deviceListEl) return;

    this.deviceListEl.innerHTML = '';

    devices.forEach((device) => {
      const item = document.createElement('div');
      item.className = `audio-output-item ${device.isActive ? 'active' : ''}`;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('data-device-id', device.deviceId);

      item.innerHTML = `
        <div class="audio-output-item-icon">
          ${this.getDeviceIconSvg(device.type)}
        </div>
        <div class="audio-output-item-info">
          <div class="audio-output-item-name">${this.escapeHtml(device.name)}</div>
          <div class="audio-output-item-status">${this.escapeHtml(device.subtitle)}</div>
        </div>
        ${device.isActive ? `
          <div class="audio-output-item-check" aria-label="Currently active output">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ` : ''}
      `;

      item.addEventListener('click', () => {
        this.selectDevice(device.deviceId, device.name);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectDevice(device.deviceId, device.name);
        }
      });

      this.deviceListEl.appendChild(item);
    });
  }

  async selectDevice(deviceId, name) {
    if (this.hasSetSinkId && this.player && this.player.audio && typeof this.player.audio.setSinkId === 'function') {
      try {
        await this.player.audio.setSinkId(deviceId);
        this.activeSinkId = deviceId;
        await this.refreshDevices();
        if (typeof UIManager !== 'undefined' && UIManager.showToast) {
          UIManager.showToast(`Switched audio to ${name}`, 'success');
        }
      } catch (err) {
        console.warn('[AudioOutput] Error setting sink ID:', err);
        if (typeof UIManager !== 'undefined' && UIManager.showToast) {
          UIManager.showToast('Audio output is managed by your device settings', 'info');
        }
      }
    } else {
      if (typeof UIManager !== 'undefined' && UIManager.showToast) {
        UIManager.showToast('Audio output is managed by your device settings', 'info');
      }
    }
  }
}
