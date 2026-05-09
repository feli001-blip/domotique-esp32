import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
// Remplacez ces valeurs par votre broker MQTT (HiveMQ, Mosquitto, etc.)
const BROKER_CONFIG = {
  host: "broker.hivemq.com",   // Votre broker MQTT
  port: 8884,                   // Port WebSocket SSL
  path: "/mqtt",
  clientId: `domo_${Math.random().toString(16).slice(2, 8)}`,
};

const ROOMS = [
  { id: "salon",   label: "Salon",   icon: "🛋️" },
  { id: "cuisine", label: "Cuisine", icon: "🍳" },
  { id: "chambre", label: "Chambre", icon: "🛏️" },
  { id: "garage",  label: "Garage",  icon: "🚗" },
];

const INITIAL_DEVICES = [
  { id: "light_salon",    room: "salon",   type: "light",  label: "Lumière principale", topic: "maison/salon/lumiere",    state: false, dimmer: 80  },
  { id: "light_cuisine",  room: "cuisine", type: "light",  label: "Lumière cuisine",    topic: "maison/cuisine/lumiere",  state: false, dimmer: 100 },
  { id: "relay_garage",   room: "garage",  type: "relay",  label: "Portail garage",     topic: "maison/garage/portail",   state: false              },
  { id: "fan_salon",      room: "salon",   type: "fan",    label: "Ventilateur",        topic: "maison/salon/ventilateur",state: false, speed: 2    },
  { id: "ac_chambre",     room: "chambre", type: "ac",     label: "Climatisation",      topic: "maison/chambre/clim",     state: false, temp: 22    },
  { id: "light_chambre",  room: "chambre", type: "light",  label: "Ambiance chambre",   topic: "maison/chambre/lumiere",  state: false, dimmer: 40  },
];

const INITIAL_SENSORS = [
  { id: "temp_salon",    room: "salon",   label: "Température", topic: "maison/salon/temperature",   unit: "°C", value: "--", icon: "🌡️" },
  { id: "hum_salon",     room: "salon",   label: "Humidité",    topic: "maison/salon/humidite",      unit: "%",  value: "--", icon: "💧" },
  { id: "temp_chambre",  room: "chambre", label: "Température", topic: "maison/chambre/temperature", unit: "°C", value: "--", icon: "🌡️" },
  { id: "motion_garage", room: "garage",  label: "Mouvement",   topic: "maison/garage/mouvement",    unit: "",   value: "--", icon: "👁️" },
];

// ─── MQTT HOOK ──────────────────────────────────────────────────────────────
function useMQTT(config) {
  const [status, setStatus]   = useState("disconnected");
  const [messages, setMessages] = useState({});
  const clientRef = useRef(null);

  const publish = useCallback((topic, payload) => {
    if (clientRef.current?.readyState === WebSocket.OPEN) {
      // Encode MQTT PUBLISH packet manually over raw WebSocket
      // In production, use mqtt.js library via CDN
      console.log(`[MQTT] Publish → ${topic}: ${payload}`);
    }
  }, []);

  // Simulation de connexion pour la démo
  useEffect(() => {
    setStatus("connecting");
    const t = setTimeout(() => {
      setStatus("connected");
      // Simulate incoming sensor data
      const interval = setInterval(() => {
        setMessages(prev => ({
          ...prev,
          "maison/salon/temperature": (20 + Math.random() * 5).toFixed(1),
          "maison/salon/humidite":    (45 + Math.random() * 20).toFixed(0),
          "maison/chambre/temperature": (19 + Math.random() * 4).toFixed(1),
          "maison/garage/mouvement":  Math.random() > 0.8 ? "Détecté" : "Aucun",
        }));
      }, 3000);
      return () => clearInterval(interval);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return { status, messages, publish };
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const colors = {
    connected:    { dot: "#22c55e", label: "Connecté" },
    connecting:   { dot: "#f59e0b", label: "Connexion…" },
    disconnected: { dot: "#ef4444", label: "Déconnecté" },
  };
  const c = colors[status];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: c.dot,
        boxShadow: status === "connected" ? `0 0 8px ${c.dot}` : "none",
        animation: status === "connecting" ? "pulse 1s infinite" : "none",
      }} />
      <span style={{ fontSize: 12, color: "#94a3b8", letterSpacing: "0.05em" }}>{c.label}</span>
    </div>
  );
}

function DeviceCard({ device, onToggle, onChange }) {
  const icons = { light: "💡", relay: "⚡", fan: "🌀", ac: "❄️" };

  return (
    <div style={{
      background: device.state
        ? "linear-gradient(135deg, #1e3a5f 0%, #1a2f4a 100%)"
        : "rgba(15, 23, 42, 0.6)",
      border: `1px solid ${device.state ? "#3b82f6" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 16,
      padding: "18px 20px",
      transition: "all 0.3s ease",
      boxShadow: device.state ? "0 0 20px rgba(59,130,246,0.15)" : "none",
      cursor: "pointer",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{icons[device.type]}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }}>
            {device.label}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2, fontFamily: "monospace" }}>
            {device.topic}
          </div>
        </div>
        {/* Toggle switch */}
        <div
          onClick={() => onToggle(device.id)}
          style={{
            width: 44, height: 24, borderRadius: 12,
            background: device.state ? "#3b82f6" : "#1e293b",
            border: `2px solid ${device.state ? "#3b82f6" : "#334155"}`,
            cursor: "pointer", position: "relative",
            transition: "all 0.3s ease", flexShrink: 0,
          }}
        >
          <div style={{
            position: "absolute", top: 2,
            left: device.state ? 20 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: device.state ? "#fff" : "#64748b",
            transition: "left 0.3s ease",
          }} />
        </div>
      </div>

      {/* Dimmer slider for lights */}
      {device.type === "light" && device.state && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Intensité</span>
            <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600 }}>{device.dimmer}%</span>
          </div>
          <input type="range" min={5} max={100} value={device.dimmer}
            onChange={e => onChange(device.id, "dimmer", +e.target.value)}
            style={{ width: "100%", accentColor: "#3b82f6" }}
          />
        </div>
      )}

      {/* Fan speed */}
      {device.type === "fan" && device.state && (
        <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
          {[1,2,3].map(s => (
            <button key={s} onClick={() => onChange(device.id, "speed", s)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 8, border: "none",
                background: device.speed === s ? "#3b82f6" : "#1e293b",
                color: device.speed === s ? "#fff" : "#64748b",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>
              {["Faible","Moyen","Fort"][s-1]}
            </button>
          ))}
        </div>
      )}

      {/* AC temperature */}
      {device.type === "ac" && device.state && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => onChange(device.id, "temp", device.temp - 1)}
            style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0",
              width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>−</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 700,
            color: "#3b82f6", fontFamily: "'DM Mono', monospace" }}>
            {device.temp}°C
          </span>
          <button onClick={() => onChange(device.id, "temp", device.temp + 1)}
            style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0",
              width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>+</button>
        </div>
      )}
    </div>
  );
}

function SensorCard({ sensor }) {
  const isRecent = sensor.value !== "--";
  return (
    <div style={{
      background: "rgba(15, 23, 42, 0.6)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{ fontSize: 28 }}>{sensor.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>{sensor.label}</div>
        <div style={{
          fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace",
          color: isRecent ? "#e2e8f0" : "#334155",
          transition: "color 0.5s",
        }}>
          {sensor.value}{sensor.unit}
        </div>
      </div>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isRecent ? "#22c55e" : "#334155",
        boxShadow: isRecent ? "0 0 8px #22c55e" : "none",
      }} />
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function DomotiqueApp() {
  const [devices,  setDevices]  = useState(INITIAL_DEVICES);
  const [sensors,  setSensors]  = useState(INITIAL_SENSORS);
  const [activeRoom, setActiveRoom] = useState("all");
  const [log, setLog] = useState([]);
  const { status, messages, publish } = useMQTT(BROKER_CONFIG);

  // Update sensors from MQTT messages
  useEffect(() => {
    setSensors(prev => prev.map(s =>
      messages[s.topic] ? { ...s, value: messages[s.topic] } : s
    ));
  }, [messages]);

  const addLog = (msg) => {
    const ts = new Date().toLocaleTimeString("fr-FR");
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 30));
  };

  const toggleDevice = (id) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, state: !d.state };
      publish(next.topic + "/cmd", next.state ? "ON" : "OFF");
      addLog(`${next.label} → ${next.state ? "ON" : "OFF"}`);
      return next;
    }));
  };

  const changeDevice = (id, key, val) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== id) return d;
      const next = { ...d, [key]: val };
      publish(next.topic + "/" + key, String(val));
      addLog(`${next.label} ${key} → ${val}`);
      return next;
    }));
  };

  const filtered = activeRoom === "all"
    ? devices
    : devices.filter(d => d.room === activeRoom);

  const filteredSensors = activeRoom === "all"
    ? sensors
    : sensors.filter(s => s.room === activeRoom);

  const activeCount = devices.filter(d => d.state).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #020817 0%, #0a1628 50%, #020b18 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { height: 4px; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "20px 20px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(2,8,23,0.85)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              🏠 Domotique ESP32
            </h1>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              {BROKER_CONFIG.host} · {activeCount} appareil{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Room tabs */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 14 }}>
          {[{ id: "all", label: "Tout", icon: "⬡" }, ...ROOMS].map(r => (
            <button key={r.id} onClick={() => setActiveRoom(r.id)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "none",
                background: activeRoom === r.id ? "#3b82f6" : "rgba(255,255,255,0.05)",
                color: activeRoom === r.id ? "#fff" : "#64748b",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", transition: "all 0.2s",
                fontFamily: "'DM Sans', sans-serif",
              }}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

        {/* Sensors */}
        {filteredSensors.length > 0 && (
          <section style={{ marginBottom: 24, animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: "#475569",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Capteurs
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {filteredSensors.map(s => <SensorCard key={s.id} sensor={s} />)}
            </div>
          </section>
        )}

        {/* Devices */}
        <section style={{ marginBottom: 24, animation: "fadeIn 0.4s ease 0.1s both" }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: "#475569",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Appareils
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map(d => (
              <DeviceCard key={d.id} device={d}
                onToggle={toggleDevice} onChange={changeDevice} />
            ))}
          </div>
        </section>

        {/* MQTT Config card */}
        <section style={{ marginBottom: 24, animation: "fadeIn 0.4s ease 0.2s both" }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: "#475569",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Configuration broker
          </h2>
          <div style={{
            background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            {[
              ["Host",    BROKER_CONFIG.host],
              ["Port WS", BROKER_CONFIG.port],
              ["Client",  BROKER_CONFIG.clientId],
              ["Topic",   "maison/+/+"],
            ].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between",
                padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 12, color: "#475569" }}>{k}</span>
                <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Activity log */}
        <section style={{ animation: "fadeIn 0.4s ease 0.3s both" }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: "#475569",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Journal MQTT
          </h2>
          <div style={{
            background: "rgba(2,8,23,0.8)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, padding: "14px 16px", maxHeight: 180, overflowY: "auto",
          }}>
            {log.length === 0 ? (
              <div style={{ fontSize: 12, color: "#334155", textAlign: "center", padding: "20px 0" }}>
                En attente d'actions…
              </div>
            ) : log.map((l, i) => (
              <div key={i} style={{
                fontSize: 11, color: i === 0 ? "#94a3b8" : "#334155",
                fontFamily: "monospace", padding: "3px 0",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                transition: "color 0.5s",
              }}>
                {l}
              </div>
            ))}
          </div>
        </section>

        {/* ESP32 Code hint */}
        <div style={{
          marginTop: 24, background: "rgba(15,23,42,0.4)",
          border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14,
          padding: "14px 16px",
        }}>
          <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, marginBottom: 8 }}>
            📟 Code ESP32 (Arduino)
          </div>
          <pre style={{
            fontSize: 10, color: "#475569", fontFamily: "monospace",
            lineHeight: 1.6, whiteSpace: "pre-wrap", overflowX: "auto",
          }}>{`#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid     = "VOTRE_WIFI";
const char* password = "VOTRE_MDP";
const char* mqtt_server = "${BROKER_CONFIG.host}";

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* topic, byte* payload, unsigned int len) {
  String msg = String((char*)payload).substring(0, len);
  if (String(topic) == "maison/salon/lumiere/cmd") {
    digitalWrite(LED_PIN, msg == "ON" ? HIGH : LOW);
  }
}

void loop() {
  // Publish sensor data every 5s
  float temp = readTemperature();
  client.publish("maison/salon/temperature",
                  String(temp).c_str());
  delay(5000);
}`}</pre>
        </div>
      </div>
    </div>
  );
                    }
   
