import { DeviceStatus, DiscoveredDevice } from "@ledgerhq/device-management-kit";
import { dmk } from "./dmk";

// Global variables to store subscriptions and session info
let discoverySubscription: any = null;
let stateSubscription: any = null;
let currentSessionId: string | null = null;

export interface DeviceState {
  deviceStatus: DeviceStatus;
  batteryStatus?: {
    level: number;
  };
  currentApp?: {
    name: string;
    version: string;
  };
  deviceModelId: string;
}

export function startDiscoveryAndConnect() {
  // Clear any previous discovery
  if (discoverySubscription) {
    discoverySubscription.unsubscribe();
  }

  console.log("Starting device discovery...");

  // Start discovering - this will scan for any connected devices
  discoverySubscription = dmk.startDiscovering({}).subscribe({
    next: async (device: DiscoveredDevice) => {
      console.log(
        `Found device: ${device.id}, model: ${device.deviceModel.model}`,
      );

      // Connect to the first device we find
      try {
        // Pass the full device object, not just the ID
        currentSessionId = await dmk.connect({ device });
        console.log(`Connected! Session ID: ${currentSessionId}`);

        // Stop discovering once we connect
        discoverySubscription.unsubscribe();

        // Get device information
        const connectedDevice = dmk.getConnectedDevice({
          sessionId: currentSessionId,
        });
        console.log(`Device name: ${connectedDevice.name}`);
        console.log(`Device model: ${connectedDevice.modelId}`);

        // Start monitoring device state
        stateSubscription = monitorDeviceState(currentSessionId);
      } catch (error) {
        console.error("Connection failed:", error);
      }
    },
    error: (error) => {
      console.error("Discovery error:", error);
    },
  });
}

export function monitorDeviceState(sessionId: string): any {
  return dmk.getDeviceSessionState({ sessionId }).subscribe({
    next: (state: DeviceState) => {
      console.log(`Device status: ${state.deviceStatus}`);

      // Check for specific status conditions
      if (state.deviceStatus === DeviceStatus.LOCKED) {
        console.log("Device is locked - please enter your PIN");
      }

      // Show battery level if available
      if (state.batteryStatus) {
        console.log(`Battery level: ${state.batteryStatus.level}%`);
      }

      // Show app information if available
      if (state.currentApp) {
        console.log(`Current app: ${state.currentApp.name}`);
        console.log(`App version: ${state.currentApp.version}`);
      }

      // Basic device model info
      console.log(`Device model: ${state.deviceModelId}`);
    },
    error: (error) => {
      console.error("State monitoring error:", error);
    },
  });
}

// Always clean up resources when done
export async function cleanup() {
  // Unsubscribe from all observables
  if (discoverySubscription) {
    discoverySubscription.unsubscribe();
  }

  if (stateSubscription) {
    stateSubscription.unsubscribe();
  }

  // Disconnect from device if connected
  if (currentSessionId) {
    try {
      await dmk.disconnect({ sessionId: currentSessionId });
      console.log("Device disconnected successfully");
      currentSessionId = null;
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  }
}

// Export current session ID for external use
export function getCurrentSessionId() {
  return currentSessionId;
}

// Export DMK instance for direct use
export { dmk }; 