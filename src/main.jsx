import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  auth,
  createUserWithEmailAndPassword,
  deleteUser,
  googleProvider,
  hasFirebaseConfig,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "./firebase";
import { classifyWasteFromCanvas } from "./edgeClassifier";
import "./styles.css";

const defaultHistory = [
  { code: "AL", item: "Aluminium Can", time: "Today - 10:45 AM", impact: 0.05, confidence: 94, label: "Recyclable", categoryKey: "metal" },
  { code: "PL", item: "Plastic Bottle", time: "Yesterday - 2:15 PM", impact: 0.02, confidence: 91, label: "Plastic", categoryKey: "plastic" }
];

const categoryDisplay = {
  plastic: "Plastic",
  paper: "Paper/Cardboard",
  biodegradable: "Organic",
  metal: "Metal",
  glass: "Glass",
  hazardous: "Battery"
};

const recycleKeys = new Set(["plastic", "paper", "metal", "glass"]);

const disposalGuide = {
  plastic: {
    code: "PL",
    title: "Plastic",
    tips: [
      "Empty bottles or containers before recycling.",
      "Flatten plastic bottles to save bin space.",
      "Remove food residue from plastic containers.",
      "Separate plastic lids if your local bins require it.",
      "Rinse detergent or shampoo bottles before disposal.",
      "Check for recycling symbols when plastic type is unclear.",
      "If plastic is dirty and cannot be cleaned, place it in residual waste.",
      "Do not mix plastic with food scraps or liquids.",
      "Crush bottles only if your recycling program allows it.",
      "Keep plastic wrappers out if your local facility does not accept soft plastics.",
      "Remove straws or small accessories before recycling plastic cups."
    ]
  },
  paper: {
    code: "PC",
    title: "Paper/Cardboard",
    tips: [
      "Recycle paper only when it is clean and dry.",
      "Remove plastic tape or stickers when possible.",
      "Do not mix wet paper with clean recyclables.",
      "Fold paper to save space in the recycling bin.",
      "Keep paper away from food waste and liquids.",
      "Paper with heavy grease should go to residual waste.",
      "Separate paper from plastic packaging before disposal.",
      "Flatten cardboard boxes before placing them in the recycling bin.",
      "Keep cardboard dry so it can still be recycled.",
      "Do not recycle greasy cardboard from food packaging."
    ]
  },
  biodegradable: {
    code: "FW",
    title: "Organic",
    tips: [
      "Place fruit and vegetable scraps in compost or biodegradable bins.",
      "Drain extra liquid before throwing organic waste.",
      "Keep organic waste separate from plastics and wrappers.",
      "Do not include batteries, glass, or metal with organic waste.",
      "Use a covered bin to reduce odor from food scraps.",
      "Compost leaves and plant trimmings when allowed.",
      "Avoid mixing oily packaging with food scraps.",
      "Separate bones or meat if your compost system does not accept them.",
      "Use biodegradable liners only if accepted locally.",
      "Dispose organic waste quickly to avoid pests and contamination."
    ]
  },
  metal: {
    code: "AL",
    title: "Metal",
    tips: [
      "Rinse cans before placing them in recycling.",
      "Remove leftover liquid from metal containers.",
      "Crush cans if your recycling program allows it.",
      "Keep sharp metal lids covered or folded inward.",
      "Do not mix batteries with ordinary metal recycling.",
      "Separate metal from plastic packaging when possible.",
      "Clean foil before recycling, or discard it if greasy.",
      "Group small metal pieces together if local rules require it.",
      "Check if aerosol cans must be empty before disposal.",
      "Place clean food cans in the metal recycling stream."
    ]
  },
  glass: {
    code: "GL",
    title: "Glass",
    tips: [
      "Empty glass bottles before recycling.",
      "Rinse glass containers to remove residue.",
      "Do not place broken glass loose in public bins.",
      "Separate glass from plastic caps and metal lids.",
      "Handle glass carefully to avoid injury.",
      "Do not mix ceramics with glass recycling.",
      "Do not include mirrors unless your local program accepts them.",
      "Sort colored glass separately if required by the facility.",
      "Wrap broken glass safely before disposal.",
      "Place glass only in bins marked for glass recycling."
    ]
  },
  hazardous: {
    code: "HZ",
    title: "Battery",
    tips: [
      "Never throw batteries in ordinary trash bins.",
      "Bring batteries to a hazardous waste collection point.",
      "Tape battery terminals if storing them before disposal.",
      "Keep batteries away from heat and direct sunlight.",
      "Do not mix leaking batteries with regular waste.",
      "Store used batteries in a dry container.",
      "Ask your campus waste office where battery drop boxes are located.",
      "Do not crush, puncture, or open batteries.",
      "Separate batteries from metal recyclables.",
      "Dispose swollen or damaged batteries through proper safety channels."
    ]
  }
};

const guideOrder = ["plastic", "paper", "biodegradable", "metal", "glass", "hazardous"];
const defaultAvatar = { type: "preset", id: "cyan" };
const profilePresets = [
  { id: "cyan", label: "Cyan", colors: ["#00d2ff", "#3a7bd5"], mark: "E" },
  { id: "green", label: "Green", colors: ["#22c55e", "#14b8a6"], mark: "CO" },
  { id: "gold", label: "Gold", colors: ["#f59e0b", "#22c55e"], mark: "12" },
  { id: "rose", label: "Rose", colors: ["#fb7185", "#3a7bd5"], mark: "AI" }
];

function pickGuideTip(key, seed = "") {
  const guide = disposalGuide[key] || disposalGuide.plastic;
  const hash = Array.from(`${seed}-${key}-${new Date().toDateString()}`).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
  return guide.tips[hash % guide.tips.length];
}

function categoryFromEntry(entry = {}) {
  const text = `${entry.categoryKey || ""} ${entry.item || ""} ${entry.label || ""}`.toLowerCase();
  if (text.includes("paper") || text.includes("cardboard")) return "paper";
  if (text.includes("plastic")) return "plastic";
  if (text.includes("organic") || text.includes("food") || text.includes("biodegradable")) return "biodegradable";
  if (text.includes("glass")) return "glass";
  if (text.includes("battery") || text.includes("hazard")) return "hazardous";
  if (text.includes("metal") || text.includes("aluminium") || text.includes("aluminum") || text.includes("can")) return "metal";
  return "plastic";
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(hasFirebaseConfig);
  const [activeView, setActiveView] = useState("dashboard");
  const [authView, setAuthView] = useState("login");
  const [showLanding, setShowLanding] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [historyItems, setHistoryItems] = useState(defaultHistory);
  const [profileAvatar, setProfileAvatar] = useState(defaultAvatar);
  const [scanResult, setScanResult] = useState({
    code: "--",
    item: "Awaiting Scan",
    label: "Edge AI Ready",
    impact: 0,
    confidence: 0,
    instruction: "Turn on the camera or upload an image to classify waste locally."
  });
  const [pwaStatus, setPwaStatus] = useState("Offline shell loading");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalledApp, setIsInstalledApp] = useState(window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? "Edge AI Online" : "Offline Mode Active");

  const clearScanResult = () => {
    setScanResult({
      code: "--",
      item: "Awaiting Scan",
      label: "Edge AI Ready",
      impact: 0,
      confidence: 0,
      instruction: "Turn on the camera or upload an image to classify waste locally."
    });
  };

  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);
  }, [isDark]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && params.has("demo")) {
      setUser(demoUser("demo@ecoscan.local", "Floyd Allen B. Bueno"));
      if (params.has("result")) {
        setScanResult({
          code: "PC",
          item: "Paper/Cardboard",
          label: "Paper/Cardboard",
          impact: 0.01,
          confidence: 93,
          categoryKey: "paper",
          engine: "Demo preview",
          createdAt: new Date().toISOString(),
          instruction: "If clean and dry, sort it as paper or cardboard. If wet, greasy, or dirty, place it in residual waste."
        });
      }
      setAuthLoading(false);
      return undefined;
    }

    if (!hasFirebaseConfig) {
      setAuthLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    const beforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setPwaStatus("Ready to install");
    };

    const installed = () => {
      setInstallPrompt(null);
      setIsInstalledApp(true);
      setPwaStatus("Installed app ready");
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  useEffect(() => {
    const updateStatus = () => setNetworkStatus(navigator.onLine ? "Edge AI Online" : "Offline Mode Active");
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setPwaStatus("Offline shell unavailable");
      return;
    }

    if (import.meta.env.DEV) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()));
      setPwaStatus("Offline shell enabled for production");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => setPwaStatus("Offline shell ready"))
      .catch(() => setPwaStatus("Offline shell pending"));
  }, []);

  useEffect(() => {
    const key = user ? `ecoscan-prime-history-${user.uid}` : "ecoscan-prime-history-demo";
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    setHistoryItems(saved || (user ? [] : defaultHistory));

    const savedAvatar = JSON.parse(localStorage.getItem(profileAvatarKey(user)) || "null");
    setProfileAvatar(savedAvatar || defaultAvatar);
  }, [user]);

  useEffect(() => {
    const key = user ? `ecoscan-prime-history-${user.uid}` : "ecoscan-prime-history-demo";
    localStorage.setItem(key, JSON.stringify(historyItems));
  }, [historyItems, user]);

  const stats = useMemo(() => {
    const totalScans = historyItems.length;
    const co2 = historyItems.reduce((sum, item) => sum + item.impact, 0);
    const accuracy = totalScans
      ? Math.round(historyItems.reduce((sum, item) => sum + (item.confidence || 86), 0) / totalScans)
      : 0;
    const categoryCounts = historyItems.reduce((counts, item) => {
      const key = item.categoryKey || categoryFromEntry(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
    const recyclableScans = historyItems.filter((item) => recycleKeys.has(item.categoryKey || categoryFromEntry(item))).length;
    const topCategoryKey = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const chartData = guideOrder.map((key) => ({
      key,
      label: categoryDisplay[key],
      count: categoryCounts[key] || 0,
      percent: totalScans ? Math.round(((categoryCounts[key] || 0) / totalScans) * 100) : 0
    }));
    const carbonGoal = 5;
    const carbonProgress = Math.min(100, Math.round((co2 / carbonGoal) * 100));
    const cloudEnergySaved = totalScans * 0.08;

    return {
      co2: co2.toFixed(2),
      totalItems: totalScans,
      accuracy,
      energy: `${cloudEnergySaved.toFixed(2)}kWh`,
      recycleRate: totalScans ? Math.round((recyclableScans / totalScans) * 100) : 0,
      topCategory: topCategoryKey ? categoryDisplay[topCategoryKey] : "No scans yet",
      categoryCounts,
      chartData,
      carbonGoal,
      carbonProgress,
      landfillAvoided: totalScans,
      carbonPerScan: totalScans ? (co2 / totalScans).toFixed(3) : "0.000"
    };
  }, [historyItems]);

  const confirmScan = () => {
    if (!scanResult.confidence) {
      return;
    }

    setHistoryItems((items) => [
      {
        code: scanResult.code,
        item: scanResult.item,
        time: "Just now",
        impact: scanResult.impact,
        confidence: scanResult.confidence,
        label: scanResult.label,
        categoryKey: scanResult.categoryKey
      },
      ...items
    ].slice(0, 20));
    clearScanResult();
    setActiveView("history");
  };

  const deleteHistoryItem = (targetIndex) => {
    setHistoryItems((items) => items.filter((_, index) => index !== targetIndex));
  };

  const clearHistory = () => {
    setHistoryItems([]);
  };

  const updateProfileAvatar = (avatar) => {
    setProfileAvatar(avatar);
    localStorage.setItem(profileAvatarKey(user), JSON.stringify(avatar));
  };

  const rescanItem = () => {
    clearScanResult();
  };

  const handleLogout = async () => {
    if (hasFirebaseConfig && auth?.currentUser) {
      await signOut(auth);
    } else {
      setUser(null);
    }
    setAuthView("login");
  };

  const installApp = async () => {
    if (isInstalledApp) {
      setPwaStatus("Installed app ready");
      return;
    }

    if (!installPrompt) {
      setPwaStatus("Use browser menu to add EcoScan to your home screen");
      return;
    }

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setPwaStatus(choice.outcome === "accepted" ? "Installing EcoScan" : "Install dismissed");
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onEnter={() => setShowLanding(false)} />;
    }

    return (
      <AuthPortal
        authView={authView}
        setAuthView={setAuthView}
        setUser={setUser}
        hasFirebaseConfig={hasFirebaseConfig}
      />
    );
  }

  return (
    <PrimeApp
      user={user}
      activeView={activeView}
      setActiveView={setActiveView}
      networkStatus={networkStatus}
      pwaStatus={pwaStatus}
      installApp={installApp}
      canInstallApp={Boolean(installPrompt) && !isInstalledApp}
      isInstalledApp={isInstalledApp}
      stats={stats}
      historyItems={historyItems}
      deleteHistoryItem={deleteHistoryItem}
      clearHistory={clearHistory}
      scanResult={scanResult}
      setScanResult={setScanResult}
      profileAvatar={profileAvatar}
      updateProfileAvatar={updateProfileAvatar}
      confirmScan={confirmScan}
      rescanItem={rescanItem}
      isDark={isDark}
      setIsDark={setIsDark}
      setUser={setUser}
      onLogout={handleLogout}
    />
  );
}

function LandingPage({ onEnter }) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://ecoscan.app";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(appUrl)}`;

  return (
    <section className="landing-page">
      <div className="landing-glow" />
      <div className="landing-shell">
        <div className="landing-copy">
          <div className="landing-logo neon-glow" aria-hidden="true"><QrIcon /></div>
          <p className="landing-kicker">SDG 12 • EDGE AI WASTE CLASSIFICATION</p>
          <h1>EcoScan</h1>
          <p className="landing-summary">
            Real-time waste classification that runs locally on the user's device, supports low-connectivity areas, and turns verified scans into sustainability insights.
          </p>
          <div className="landing-actions">
            <button onClick={onEnter} type="button">ENTER SYSTEM</button>
            <span>Offline-first PWA • Firebase Auth • TensorFlow.js</span>
          </div>
        </div>

        <div className="landing-qr-card glass-panel">
          <img src={qrUrl} alt="QR code to access EcoScan" />
          <p>Scan to access EcoScan</p>
          <strong>{appUrl.replace(/^https?:\/\//, "")}</strong>
        </div>
      </div>
    </section>
  );
}

function AuthPortal({ authView, setAuthView, setUser, hasFirebaseConfig }) {
  const [currentMode, setCurrentMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
  };

  const switchAuthView = (view) => {
    if (view === "forgot") {
      setResetEmail(form.email);
    }
    setAuthView(view);
    setMessage("");
  };

  const toggleAuth = () => {
    if (currentMode === "login") {
      setCurrentMode("signup");
      switchAuthView("signup");
      return;
    }

    setCurrentMode("login");
    switchAuthView("login");
  };

  const login = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (hasFirebaseConfig) {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      } else {
        setUser(demoUser(form.email || "floyd@college.edu", "Floyd Allen B. Bueno"));
      }
    } catch (error) {
      setMessage(authError(error));
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (hasFirebaseConfig) {
        const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(credential.user, { displayName: form.name || "EcoScan User" });
      } else {
        setUser(demoUser(form.email || "floyd@college.edu", form.name || "Floyd Allen B. Bueno"));
      }
    } catch (error) {
      setMessage(authError(error));
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    const email = resetEmail.trim();
    if (!email) {
      setMessage("Enter your registered email address first.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      if (hasFirebaseConfig) {
        await sendPasswordResetEmail(auth, email, {
          url: window.location.origin,
          handleCodeInApp: false
        });
        setMessage(`Password reset email sent to ${email}. Check your inbox or spam folder.`);
      } else {
        setMessage("Demo mode: recovery request saved. Add Firebase config to send real email.");
      }
    } catch (error) {
      setMessage(authError(error));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (hasFirebaseConfig) {
        await signInWithPopup(auth, googleProvider);
      } else {
        setUser(demoUser("google.user@college.edu", "Floyd Allen B. Bueno"));
      }
    } catch (error) {
      setMessage(authError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-portal">
      <div className="auth-glow" />
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="auth-logo neon-glow" aria-hidden="true">
            <QrIcon />
          </div>
          <h1>ECOSCAN</h1>
        </div>

        <div className="auth-card glass-panel">
          {authView === "login" && (
            <div>
              <h2>System Login</h2>
              <form className="auth-form" onSubmit={(event) => { event.preventDefault(); login(); }}>
                <AuthField label="Email Address" type="email" placeholder="name@college.edu" value={form.email} onChange={(value) => updateForm("email", value)} />
                <div className="auth-field password-field">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" value={form.password} onChange={(event) => updateForm("password", event.target.value)} />
                  <button onClick={() => switchAuthView("forgot")} type="button">FORGOT?</button>
                </div>
                <button className="primary-auth-button" type="submit" disabled={loading}>{loading ? "ACCESSING..." : "LOGIN"}</button>
              </form>
            </div>
          )}

          {authView === "signup" && (
            <div>
              <h2>Register Identity</h2>
              <form className="auth-form compact" onSubmit={(event) => { event.preventDefault(); signup(); }}>
                <AuthField label="Full Name" type="text" placeholder="Floyd Allen" value={form.name} onChange={(value) => updateForm("name", value)} />
                <AuthField label="Email" type="email" placeholder="floyd@college.edu" value={form.email} onChange={(value) => updateForm("email", value)} />
                <AuthField label="Password" type="password" placeholder="••••••••" value={form.password} onChange={(value) => updateForm("password", value)} />
                <button className="primary-auth-button" type="submit" disabled={loading}>{loading ? "CREATING..." : "CREATE ACCOUNT"}</button>
              </form>
            </div>
          )}

          {authView === "forgot" && (
            <div>
              <h2>Reset Access</h2>
              <p className="forgot-copy">Enter your registered email address and Firebase will send a password reset link.</p>
              <form className="auth-form" onSubmit={(event) => { event.preventDefault(); forgot(); }}>
                <AuthField label="Registered Email" type="email" placeholder="name@college.edu" value={resetEmail} onChange={(value) => { setResetEmail(value); setMessage(""); }} />
                <button className="secondary-auth-button" type="submit" disabled={loading}>{loading ? "SENDING..." : "SEND RECOVERY KEY"}</button>
                <button onClick={() => switchAuthView("login")} className="back-login-button" type="button">BACK TO LOGIN</button>
              </form>
            </div>
          )}

          {message && <p className="auth-message">{message}</p>}

          {authView !== "forgot" && (
            <>
              <div className="divider"><span>Quick Access</span></div>
              <button onClick={googleLogin} className="google-button" type="button" disabled={loading}>
                <GoogleIcon />
                Google Login
              </button>
              <p className="auth-toggle">
                <span>{currentMode === "login" ? "New user?" : "Have an account?"}</span>
                <button onClick={toggleAuth} type="button">{currentMode === "login" ? "Create Identity" : "Access Login"}</button>
              </p>
            </>
          )}

          {!hasFirebaseConfig && (
            <p className="auth-message subtle">Demo auth is active. Add your Firebase keys in `.env` to use real accounts.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function AuthField({ label, type, placeholder, value, onChange }) {
  return (
    <div className="auth-field">
      <label>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function PrimeApp(props) {
  const displayName = props.user.displayName || props.user.email?.split("@")[0] || "Floyd";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="prime-app">
      <aside className="sidebar glass-panel">
        <ProfileAvatar avatar={props.profileAvatar} name={displayName} className="sidebar-avatar neon-glow" />
        <h1>Hi, {capitalize(firstName)}.</h1>
        <p className="profile-meta">Gordon College • BSCS-2C</p>
        <nav className="nav-list" aria-label="EcoScan sections">
          {["dashboard", "history", "settings"].map((view) => (
            <button key={view} onClick={() => props.setActiveView(view)} className={`nav-btn ${props.activeView === view ? "active" : ""}`} type="button">
              <span /> {view.toUpperCase()}
            </button>
          ))}
        </nav>
        <div className="status-card">
          <p>System Status</p>
          <div className="status-line"><i /><span>{props.networkStatus}</span></div>
          <small>{props.pwaStatus}</small>
        </div>
      </aside>

      <main className="main-stage">
        {props.activeView === "dashboard" && <DashboardView {...props} />}
        {props.activeView === "history" && (
          <HistoryView
            historyItems={props.historyItems}
            deleteHistoryItem={props.deleteHistoryItem}
            clearHistory={props.clearHistory}
          />
        )}
        {props.activeView === "settings" && <SettingsView {...props} />}
      </main>
    </div>
  );
}

function ProfileAvatar({ avatar, name, className = "" }) {
  const preset = profilePresets.find((item) => item.id === avatar?.id) || profilePresets[0];
  const initials = getInitials(name);

  if (avatar?.type === "upload" && avatar.src) {
    return (
      <div className={`profile-avatar ${className}`}>
        <img src={avatar.src} alt={`${name || "EcoScan"} profile`} />
      </div>
    );
  }

  return (
    <div
      className={`profile-avatar preset-avatar ${className}`}
      style={{
        "--avatar-start": preset.colors[0],
        "--avatar-end": preset.colors[1]
      }}
      aria-label={`${preset.label} profile avatar`}
      role="img"
    >
      <span>{preset.mark || initials}</span>
    </div>
  );
}

function DashboardView({ scanResult, setScanResult, confirmScan, rescanItem, stats }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreviewActive, setImagePreviewActive] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("On-device model standby");
  const hasIdentification = scanResult.confidence > 0;
  const activeGuideKey = scanResult.categoryKey || "plastic";
  const activeGuide = disposalGuide[activeGuideKey] || disposalGuide.plastic;
  const activeGuideTip = pickGuideTip(activeGuideKey, scanResult.createdAt || scanResult.item);

  useEffect(() => {
    return () => stopCamera(streamRef);
  }, []);

  useEffect(() => {
    if (scanResult.confidence > 0) {
      return;
    }

    if (fileRef.current) {
      fileRef.current.value = "";
    }
    setImagePreviewActive(false);
    setScannerMessage(cameraActive ? "Scanner reset. Camera is still live." : "Scanner reset. Turn on camera or upload a new image.");
  }, [scanResult.confidence, cameraActive]);

  const toggleCamera = async () => {
    if (cameraActive) {
      stopCamera(streamRef);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setScannerMessage("Camera off. Start camera or upload an image to scan.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setImagePreviewActive(false);
      setScannerMessage("Camera active. Place one item inside the cyan focus box.");
    } catch (error) {
      setScannerMessage("Camera permission was blocked. Upload an image instead.");
    }
  };

  const captureAndClassify = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      setScannerMessage("Camera is not ready yet.");
      return;
    }

    try {
      setIsClassifying(true);
      setScannerMessage("Running Edge AI on this device...");
      drawFocusedFrame(video, canvas);
      const result = await classifyWasteFromCanvas(canvas, "focused camera capture");
      setScanResult(result);
      setImagePreviewActive(false);
      stopCamera(streamRef);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setScannerMessage(`${result.label} detected at ${result.confidence}% confidence using ${result.engine}.`);
    } catch (error) {
      setScannerMessage("The AI could not read this frame. Move closer and try again.");
    } finally {
      setIsClassifying(false);
    }
  };

  const uploadAndClassify = (event) => {
    const [file] = event.target.files;
    if (!file) {
      return;
    }

    const image = new Image();
    image.onload = async () => {
      try {
        const canvas = canvasRef.current;
        setIsClassifying(true);
        setScannerMessage("Running Edge AI on uploaded image...");
        drawFocusedImage(image, canvas);
        URL.revokeObjectURL(image.src);

        const result = await classifyWasteFromCanvas(canvas, file.name);
        setScanResult(result);
        setImagePreviewActive(true);
        setCameraActive(false);
        stopCamera(streamRef);
        setScannerMessage(`${result.label} detected at ${result.confidence}% confidence using ${result.engine}.`);
      } catch (error) {
        setScannerMessage("The AI could not read that image. Try a clearer photo.");
      } finally {
        setIsClassifying(false);
      }
    };
    image.src = URL.createObjectURL(file);
  };

  const resetScanner = async () => {
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    setImagePreviewActive(false);
    rescanItem();
    if (cameraActive) {
      setScannerMessage("Scanner reset. Camera is still live.");
      return;
    }

    setScannerMessage("Scanner reset. Starting camera again...");
    await toggleCamera();
  };

  return (
    <section className="dashboard-view">
      <div className="scanner-stack">
        <div className={hasIdentification ? "scanner-card result-mode glass-panel" : "scanner-card glass-panel"}>
        {!hasIdentification && (
          <div className="scanner-blackout">
            <video ref={videoRef} className={cameraActive ? "scanner-video active" : "scanner-video"} autoPlay playsInline muted />
            <canvas ref={canvasRef} className={imagePreviewActive ? "scanner-canvas active" : "scanner-canvas"} />
            <div className="scan-target">
              <div className="scan-anim" />
              <div className="corner top-left" />
              <div className="corner bottom-right" />
              <span className="focus-copy">CENTER ITEM HERE</span>
            </div>
            <div className={cameraActive ? "live-badge active" : "live-badge"}>
              {cameraActive ? "LIVE CAMERA" : imagePreviewActive ? "IMAGE PREVIEW" : "STANDBY"}
            </div>
          </div>
        )}
        {hasIdentification && (
          <div className="identified-card result-only glass-panel">
            <p>Object Identified</p>
            <h2>{scanResult.item}</h2>
            <div className="ai-meta">
              <span>{scanResult.label}</span>
              <span>{scanResult.confidence}% confidence</span>
            </div>
            <p className="ai-instruction">{scanResult.instruction}</p>
            <div className="inline-result-guide">
              <span>{activeGuide.code}</span>
              <small>{activeGuideTip}</small>
            </div>
            <div className="confirm-row">
              <button onClick={confirmScan} type="button" disabled={isClassifying}>CONFIRM</button>
              <button onClick={resetScanner} type="button" disabled={isClassifying}>RESCAN</button>
            </div>
          </div>
        )}
        {!hasIdentification && (
          <div className="scanner-control-card glass-panel">
            <p>Edge AI Scanner</p>
            <h3>Start a scan</h3>
            <p className="scanner-message">{scannerMessage}</p>
            <div className="scanner-actions">
              <button onClick={toggleCamera} className={cameraActive ? "camera-danger" : ""} type="button" disabled={isClassifying}>{cameraActive ? "TURN OFF" : "TURN ON"}</button>
              <button onClick={captureAndClassify} type="button" disabled={!cameraActive || isClassifying}>{isClassifying ? "SCANNING" : "CAPTURE"}</button>
              <button onClick={() => fileRef.current.click()} type="button" disabled={isClassifying}>UPLOAD</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadAndClassify} />
            </div>
          </div>
        )}
        </div>
        <RealTimeMetrics stats={stats} scanResult={scanResult} hasIdentification={hasIdentification} />
        <EfficiencyAnalytics stats={stats} />
      </div>
      <div className="dashboard-column">
        <section className="impact-panel glass-panel">
          <p>Environmental Impact</p>
          <div className="impact-total"><span>{stats.co2}</span><strong>kg CO2</strong></div>
          <div className="impact-grid">
            <div><p>SCANS</p><strong>{stats.totalItems}</strong></div>
            <div><p>AVG CONFIDENCE</p><strong>{stats.accuracy}%</strong></div>
            <div><p>RECYCLE RATE</p><strong>{stats.recycleRate}%</strong></div>
            <div><p>TOP CATEGORY</p><strong>{stats.topCategory}</strong></div>
          </div>
        </section>
        <CarbonTracking stats={stats} />
        <section className="guide-panel glass-panel">
          <p>{hasIdentification ? "Recommended Guide" : "Disposal Guide"}</p>
          {hasIdentification && (
            <div className="guide-feature">
              <span>{activeGuide.code}</span>
              <div>
                <strong>{activeGuide.title}</strong>
                <small>{activeGuideTip}</small>
              </div>
            </div>
          )}
          {!hasIdentification && (
            <div className="guide-list">
              {guideOrder.map((key) => {
                const guide = disposalGuide[key];
                return (
                  <div className="guide-item" key={key}>
                    <span>{guide.code}</span>
                    <div>
                      <strong>{guide.title}</strong>
                      <small>{pickGuideTip(key, scanResult.createdAt || key)}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function EfficiencyAnalytics({ stats }) {
  return (
    <section className="efficiency-panel glass-panel">
      <p>Efficiency Analytics</p>
      <div className="category-chart">
        {stats.chartData.map((item) => (
          <div className="category-row" key={item.key}>
            <div>
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
            <i><b style={{ width: `${Math.max(4, item.percent)}%` }} /></i>
          </div>
        ))}
      </div>
      <div className="energy-note"><p>Local Edge AI avoided about <strong>{stats.energy}</strong> of cloud processing energy.</p></div>
    </section>
  );
}

function CarbonTracking({ stats }) {
  return (
    <section className="carbon-panel glass-panel">
      <p>Carbon Tracking</p>
      <div className="carbon-meter">
        <div><span style={{ width: `${stats.carbonProgress}%` }} /></div>
        <strong>{stats.co2} / {stats.carbonGoal.toFixed(1)} kg CO2 goal</strong>
      </div>
      <div className="carbon-grid">
        <div><span>Per Scan</span><strong>{stats.carbonPerScan} kg</strong></div>
        <div><span>Items Tracked</span><strong>{stats.landfillAvoided}</strong></div>
      </div>
    </section>
  );
}

function RealTimeMetrics({ stats, scanResult, hasIdentification }) {
  const currentConfidence = hasIdentification ? scanResult.confidence : 0;
  const confidenceLabel = hasIdentification ? `${currentConfidence}%` : "Standby";

  return (
    <section className="realtime-metrics-panel glass-panel" aria-label="Real-time dashboard metrics">
      <div className="metric-card">
        <p>Total Items Scanned</p>
        <strong>{stats.totalItems}</strong>
        <span>Successful classifications</span>
      </div>
      <div className="metric-card">
        <p>Environmental Impact</p>
        <strong>{stats.co2}<small> kg CO2</small></strong>
        <span>Saved from confirmed scans</span>
      </div>
      <div className="metric-card confidence-card">
        <p>Accuracy Gauge</p>
        <div className="confidence-gauge" style={{ "--confidence": `${currentConfidence}%` }}>
          <strong>{confidenceLabel}</strong>
        </div>
        <span>{hasIdentification ? "Current AI prediction" : "Waiting for scan"}</span>
      </div>
    </section>
  );
}

function HistoryView({ historyItems, deleteHistoryItem, clearHistory }) {
  return (
    <section className="history-panel glass-panel">
      <div className="history-header">
        <h2>Scan History</h2>
        <button onClick={clearHistory} type="button" disabled={!historyItems.length}>Clear All</button>
      </div>
      <div className="history-list">
        {!historyItems.length && (
          <div className="empty-history glass-panel">
            <p>No scans yet</p>
            <span>Confirmed items will appear here after classification.</span>
          </div>
        )}
        {historyItems.map((entry, index) => (
          <div className="history-item glass-panel" key={`${entry.item}-${entry.time}-${index}`}>
            <div className="history-left">
              <div className="history-code">{entry.code}</div>
              <div>
                <p>{entry.item}</p>
                <small>{entry.time} - {entry.label || "Unlabeled"} - {entry.confidence || 86}%</small>
              </div>
            </div>
            <div className="history-actions">
              <span className="history-impact">+{entry.impact.toFixed(2)}kg CO2</span>
              <button onClick={() => deleteHistoryItem(index)} type="button">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsView({ user, isDark, setIsDark, setUser, onLogout, historyItems, clearHistory, profileAvatar, updateProfileAvatar, installApp, canInstallApp, isInstalledApp, pwaStatus }) {
  const [name, setName] = useState(user.displayName || "Floyd Allen B. Bueno");
  const [settingsMessage, setSettingsMessage] = useState("");
  const avatarInputRef = useRef(null);

  const saveName = async () => {
    if (hasFirebaseConfig && auth?.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      setUser({ ...auth.currentUser });
    } else {
      setUser({ ...user, displayName: name });
    }
    setSettingsMessage("Profile name updated.");
  };

  const downloadHistory = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: user.email,
      scans: historyItems
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ecoscan-history.json";
    link.click();
    URL.revokeObjectURL(url);
    setSettingsMessage("Scan history exported.");
  };

  const clearSavedHistory = () => {
    if (!window.confirm("Clear all saved scan history for this account?")) {
      return;
    }

    clearHistory();
    setSettingsMessage("Scan history cleared.");
  };

  const choosePresetAvatar = (id) => {
    updateProfileAvatar({ type: "preset", id });
    setSettingsMessage("Profile picture updated.");
  };

  const uploadAvatar = async (event) => {
    const [file] = event.target.files;
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSettingsMessage("Choose an image file for your profile picture.");
      return;
    }

    try {
      const src = await resizeAvatarImage(file);
      updateProfileAvatar({ type: "upload", src });
      setSettingsMessage("Profile picture uploaded.");
    } catch (error) {
      setSettingsMessage("That image could not be loaded. Try another picture.");
    } finally {
      event.target.value = "";
    }
  };

  const removeAccount = async () => {
    if (!window.confirm("Delete this EcoScan account? This removes the account from Firebase and clears local scan history.")) {
      return;
    }

    try {
      clearHistory();
      if (hasFirebaseConfig && auth?.currentUser) {
        await deleteUser(auth.currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      const recentLogin = error.code === "auth/requires-recent-login";
      setSettingsMessage(recentLogin ? "Please log out, log in again, then delete the account." : authError(error));
    }
  };

  return (
    <section className="settings-panel glass-panel">
      <h2>Settings</h2>
      <div className="settings-stack">
        <div className="profile-picture-card glass-panel">
          <ProfileAvatar avatar={profileAvatar} name={name} className="settings-avatar" />
          <div className="profile-picture-controls">
            <div>
              <p>Profile Picture</p>
              <span>Upload your own image or choose an EcoScan avatar.</span>
            </div>
            <div className="avatar-preset-grid">
              {profilePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => choosePresetAvatar(preset.id)}
                  className={profileAvatar?.type === "preset" && profileAvatar.id === preset.id ? "active" : ""}
                  type="button"
                  aria-label={`Use ${preset.label} avatar`}
                  style={{ "--avatar-start": preset.colors[0], "--avatar-end": preset.colors[1] }}
                >
                  <span>{preset.mark}</span>
                </button>
              ))}
            </div>
            <div className="profile-picture-actions">
              <button onClick={() => avatarInputRef.current.click()} type="button">Upload Photo</button>
              <button onClick={() => choosePresetAvatar(defaultAvatar.id)} type="button">Use Default</button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} />
            </div>
          </div>
        </div>
        <div className="field-group">
          <label>Display Name</label>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          <button onClick={saveName} type="button">Update</button>
        </div>
        <div className="setting-row glass-panel">
          <div><p>Dark Mode</p><span>System preference</span></div>
          <button onClick={() => setIsDark(!isDark)} id="mode-toggle" className="mode-toggle" type="button" aria-label="Toggle dark mode">
            <span style={isDark ? { right: 4, left: "auto" } : { left: 4, right: "auto" }} />
          </button>
        </div>
        <div className="setting-row glass-panel">
          <div>
            <p>Install EcoScan</p>
            <span>{isInstalledApp ? "EcoScan is running as an installed app." : pwaStatus}</span>
          </div>
          <button onClick={installApp} className="install-app-button" type="button" disabled={isInstalledApp}>
            {isInstalledApp ? "Installed" : canInstallApp ? "Install" : "How To Install"}
          </button>
        </div>
        <div className="setting-tools glass-panel">
          <div>
            <p>Account Tools</p>
            <span>Manage your saved EcoScan data.</span>
          </div>
          <div className="settings-actions">
            <button onClick={downloadHistory} type="button" disabled={!historyItems.length}>Download History</button>
            <button onClick={clearSavedHistory} type="button" disabled={!historyItems.length}>Clear History</button>
            <button onClick={removeAccount} className="danger-action" type="button">Delete Account</button>
          </div>
        </div>
        {settingsMessage && <p className="settings-message">{settingsMessage}</p>}
        <button onClick={onLogout} className="logout-button" type="button">LOG OUT</button>
      </div>
    </section>
  );
}

function LoadingScreen() {
  return (
    <section className="auth-portal">
      <div className="auth-glow" />
      <div className="auth-brand">
        <div className="auth-logo neon-glow"><QrIcon /></div>
        <h1>ECOSCAN</h1>
      </div>
    </section>
  );
}

function demoUser(email, displayName) {
  return { uid: `demo-${email}`, email, displayName };
}

function profileAvatarKey(user) {
  return user ? `ecoscan-prime-avatar-${user.uid}` : "ecoscan-prime-avatar-demo";
}

function getInitials(name = "EcoScan User") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "EC";
}

function resizeAvatarImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const size = 240;
      const sourceSize = Math.min(image.width, image.height);
      const sourceX = Math.floor((image.width - sourceSize) / 2);
      const sourceY = Math.floor((image.height - sourceSize) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas
        .getContext("2d")
        .drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };

    image.src = url;
  });
}

function codeForMaterial(material) {
  return material.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function stopCamera(streamRef) {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
}

function drawFocusedFrame(video, canvas) {
  const sourceSize = Math.floor(Math.min(video.videoWidth, video.videoHeight) * 0.62);
  const sourceX = Math.floor((video.videoWidth - sourceSize) / 2);
  const sourceY = Math.floor((video.videoHeight - sourceSize) / 2);
  canvas.width = 320;
  canvas.height = 320;
  canvas
    .getContext("2d", { willReadFrequently: true })
    .drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
}

function drawFocusedImage(image, canvas) {
  const sourceSize = Math.floor(Math.min(image.width, image.height) * 0.72);
  const sourceX = Math.floor((image.width - sourceSize) / 2);
  const sourceY = Math.floor((image.height - sourceSize) / 2);
  canvas.width = 320;
  canvas.height = 320;
  canvas
    .getContext("2d", { willReadFrequently: true })
    .drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
}

function authError(error) {
  const messages = {
    "auth/email-already-in-use": "That email already has an EcoScan identity.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/missing-email": "Enter your registered email address first.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication.",
    "auth/popup-blocked": "The browser blocked the Google popup. Allow popups for this site and try again.",
    "auth/popup-closed-by-user": "Google login was closed before it finished.",
    "auth/unauthorized-continue-uri": "This deployed domain is not authorized in Firebase Authentication settings.",
    "auth/unauthorized-domain": "This deployed domain is not authorized in Firebase Authentication settings.",
    "auth/user-not-found": "No EcoScan account exists for that email.",
    "auth/weak-password": "Use at least 6 characters for the password."
  };
  return messages[error.code] || error.message || "Authentication failed. Please try again.";
}

function capitalize(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function QrIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1Zm12 0h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1ZM5 20h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

createRoot(document.getElementById("root")).render(<App />);
