#!/usr/bin/env node
// OnStarJS2 test harness — exercises all major API functions
import dotenv from "dotenv";
dotenv.config();

import OnStar from "onstarjs2";

const config = {
  deviceId: process.env.DEVICEID,
  vin: process.env.VIN,
  username: process.env.ONSTAR_USERNAME,
  password: process.env.ONSTAR_PASSWORD,
  onStarPin: process.env.ONSTAR_PIN,
  onStarTOTP: process.env.ONSTAR_TOTPKEY,
  tokenLocation: process.env.TOKEN_LOCATION || "./",
  checkRequestStatus: process.env.CHECK_REQUEST_STATUS === "true",
  max429Retries: parseInt(process.env.MAX_429_RETRIES || "4"),
  initial429DelayMs: parseInt(process.env.INITIAL_429_DELAY_MS || "1500"),
  backoffFactor: parseInt(process.env.BACKOFF_FACTOR || "2"),
  jitterMs: parseInt(process.env.JITTER_MS || "500"),
  max429DelayMs: parseInt(process.env.MAX_429_DELAY_MS || "60000"),
};

const onStar = OnStar.create(config);

async function main() {
  const command = process.argv[2] || "vehicles";

  try {
    switch (command) {
      case "vehicles": {
        console.log("🚗 Getting account vehicles...");
        const result = await onStar.getAccountVehicles();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "details": {
        console.log("📋 Getting vehicle details...");
        const result = await onStar.getVehicleDetails();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "diagnostics": {
        console.log("📊 Getting vehicle diagnostics...");
        const result = await onStar.diagnostics();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "location": {
        console.log("📍 Getting vehicle location...");
        const result = await onStar.location();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "plan": {
        console.log("📡 Getting OnStar plan...");
        const result = await onStar.getOnstarPlan();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "recall": {
        console.log("⚠️ Getting recall info...");
        const result = await onStar.getVehicleRecallInfo();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "warranty": {
        console.log("🛡️ Getting warranty info...");
        const result = await onStar.getWarrantyInfo();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "sxm": {
        console.log("📻 Getting SiriusXM info...");
        const result = await onStar.getSxmSubscriptionInfo();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "ev-metrics": {
        console.log("🔋 Getting EV charging metrics...");
        const result = await onStar.getEVChargingMetrics();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "ev-refresh": {
        console.log("🔄 Refreshing EV charging metrics...");
        const result = await onStar.refreshEVChargingMetrics();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "start": {
        console.log("🚀 Remote starting vehicle...");
        const result = await onStar.start();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "cancel-start": {
        console.log("🛑 Canceling remote start...");
        const result = await onStar.cancelStart();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "lock": {
        console.log("🔒 Locking doors...");
        const result = await onStar.lockDoor();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "unlock": {
        console.log("🔓 Unlocking doors...");
        const result = await onStar.unlockDoor();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "alert": {
        console.log("🚨 Flashing lights & honking...");
        const result = await onStar.alert({ action: ["Flash", "Honk"], duration: 1 });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "flash": {
        console.log("💡 Flashing lights...");
        const result = await onStar.flashLights();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "honk": {
        console.log("📢 Honking horn...");
        const result = await onStar.alert({ action: ["Honk"], duration: 1 });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        console.log(`Unknown command: ${command}`);
        console.log("Available: vehicles, details, diagnostics, location, plan, recall, warranty, sxm, ev-metrics, ev-refresh, start, cancel-start, lock, unlock, alert, flash, honk");
        process.exit(1);
    }
  } catch (err) {
    console.error("❌ Error:", err.message || err);
    if (err.response?.data) console.error("Response:", JSON.stringify(err.response.data, null, 2));
    process.exit(1);
  }
}

main();
