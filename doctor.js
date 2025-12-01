// doctor.js (updated with per-doctor isolation + Firebase Auth multi-doctor login + signup, Intake Stats, delete modal, sync indicator)

// ---------- FIREBASE IMPORTS ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  getDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// ---------- YOUR FIREBASE CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyCn_UfkYp8_6V_J2AclEFATecbRlAm8EIU",
  authDomain: "careconnect-hospital.firebaseapp.com",
  projectId: "careconnect-hospital",
  storageBucket: "careconnect-hospital.appspot.com",
  messagingSenderId: "806212189308",
  appId: "1:806212189308:web:9b6e1ac5787fa6a96b1df9"
};

// ---------- INIT FIREBASE ----------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const patientsColRef = collection(db, "patients");
const devicesColRef = collection(db, "devices");
const doctorsColRef = collection(db, "doctors");
// Intake logs collection (for adherence stats)
const intakeLogsColRef = collection(db, "intakeLogs");

let patients = [];
let selectedPatientId = null;
let patientsUnsubscribe = null;

let intakeLogs = [];
let intakeUnsubscribe = null;
let currentIntakePatientId = null;

// track where Add/Edit was opened from: 'home' | 'patients' | 'dashboard'
let lastOpenFrom = "home";

// current logged-in doctor
let currentDoctor = null;
let currentDoctorName = "Doctor";

// ---------- ELEMENTS ----------
const toastEl = document.getElementById("toast");
const globalLoading = document.getElementById("globalLoading");

const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginIdInput = document.getElementById("loginId");
const loginPasswordInput = document.getElementById("loginPassword");
const rememberMeCheckbox = document.getElementById("rememberMe");

// Auth tabs + signup form
const showLoginTabBtn = document.getElementById("showLoginTab");
const showSignupTabBtn = document.getElementById("showSignupTab");

const signupForm = document.getElementById("signupForm");
const signupNameInput = document.getElementById("signupName");
const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const signupConfirmPasswordInput = document.getElementById(
  "signupConfirmPassword"
);

const topbar = document.querySelector(".topbar");
const doctorNameLabel = document.getElementById("doctorNameLabel");
const logoutBtn = document.getElementById("logoutBtn");
const syncIndicator = document.getElementById("syncIndicator");
const syncText = document.getElementById("syncText");

const homeScreen = document.getElementById("homeScreen");
const mainLayout = document.getElementById("mainLayout");
const dashboardLayout = document.getElementById("dashboardLayout");
const intakeLayout = document.getElementById("intakeLayout");
const addPatientLayout = document.getElementById("addPatientLayout");

const homeViewDetailsBtn = document.getElementById("homeViewDetailsBtn");
const homeAddPatientBtn = document.getElementById("homeAddPatientBtn");
const homeDashboardBtn = document.getElementById("homeDashboardBtn");
const homeIntakeStatsBtn = document.getElementById("homeIntakeStatsBtn");

const backHomeBtn = document.getElementById("backHomeBtn");
const backHomeFromDashboardBtn = document.getElementById(
  "backHomeFromDashboardBtn"
);
const backHomeFromIntakeBtn = document.getElementById("backHomeFromIntakeBtn");
const backFromAddBtn = document.getElementById("backFromAddBtn");

const patientsTableBody = document.getElementById("patientsTableBody");
const totalPatientsEl = document.getElementById("totalPatients");
const withMedsCountEl = document.getElementById("withMedsCount");
const patientSearchInput = document.getElementById("patientSearchInput");

const noSelectionEl = document.getElementById("noSelection");
const patientDetailsEl = document.getElementById("patientDetails");
const detailAvatar = document.getElementById("detailAvatar");
const detailName = document.getElementById("detailName");
const detailId = document.getElementById("detailId");
const detailAge = document.getElementById("detailAge");
const detailGender = document.getElementById("detailGender");
const detailHeight = document.getElementById("detailHeight");
const detailWeight = document.getElementById("detailWeight");
const detailDob = document.getElementById("detailDob");
const detailStatus = document.getElementById("detailStatus");
const detailCuredIn = document.getElementById("detailCuredIn");
const detailHistoryList = document.getElementById("detailHistoryList");
const detailMedsBody = document.getElementById("detailMedsBody");

const addPatientBtn = document.getElementById("addPatientBtn");
const editPatientBtn = document.getElementById("editPatientBtn");
const deletePatientBtn = document.getElementById("deletePatientBtn");
const printPrescriptionBtn = document.getElementById("printPrescriptionBtn");

const addPageTitle = document.getElementById("addPageTitle");
const patientForm = document.getElementById("patientForm");
const cancelAddBtn = document.getElementById("cancelAddBtn");
const savePatientBtn = document.getElementById("savePatientBtn");

const formPatientId = document.getElementById("formPatientId");
const formPatientName = document.getElementById("formPatientName");
const formDob = document.getElementById("formDob");
const formGender = document.getElementById("formGender");
const formHeight = document.getElementById("formHeight");
const formWeight = document.getElementById("formWeight");

const formBpHistory = document.getElementById("formBpHistory");
const formDiabetic = document.getElementById("formDiabetic");
const formSurgeries = document.getElementById("formSurgeries");

const formStatus = document.getElementById("formStatus");
const formCuredInDays = document.getElementById("formCuredInDays");

const formDeviceId = document.getElementById("formDeviceId");

const formMedsBody = document.getElementById("formMedsBody");
const addMedRowBtn = document.getElementById("addMedRowBtn");
const editingPatientIdInput = document.getElementById("editingPatientId");

const dashTotalPatients = document.getElementById("dashTotalPatients");
const dashWithMeds = document.getElementById("dashWithMeds");
const dashMalePatients = document.getElementById("dashMalePatients");
const dashFemalePatients = document.getElementById("dashFemalePatients");
const dashOtherPatients = document.getElementById("dashOtherPatients");
const dashWithBpHistory = document.getElementById("dashWithBpHistory");
const dashDiabeticPatients = document.getElementById("dashDiabeticPatients");
const dashCuredPatients = document.getElementById("dashCuredPatients");

// Intake stats elements
const intakePatientsBody = document.getElementById("intakePatientsBody");
const intakeSelectedName = document.getElementById("intakeSelectedName");
const intakeSelectedId = document.getElementById("intakeSelectedId");
const intakeTotalEvents = document.getElementById("intakeTotalEvents");
const intakeTakenCount = document.getElementById("intakeTakenCount");
const intakeMissedCount = document.getElementById("intakeMissedCount");
const intakeAdherencePercent = document.getElementById(
  "intakeAdherencePercent"
);
const intakeEventsBody = document.getElementById("intakeEventsBody");

// Delete confirm modal
const confirmDeleteModal = document.getElementById("confirmDeleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
let pendingDeletePatientId = null;

// ---------- HELPERS ----------
function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(function () {
    toastEl.classList.remove("show");
  }, 2000);
}

function setSyncState(state, message) {
  if (!syncIndicator || !syncText) return;
  syncIndicator.classList.remove("sync-error", "sync-offline");
  if (state === "online") {
    syncText.textContent = message || "Online";
  } else if (state === "error") {
    syncIndicator.classList.add("sync-error");
    syncText.textContent = message || "Sync issue";
  } else if (state === "offline") {
    syncIndicator.classList.add("sync-offline");
    syncText.textContent = message || "Offline";
  }
}

function calculateAge(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob)) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dobString) {
  if (!dobString) return "—";
  const d = new Date(dobString);
  if (isNaN(d)) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return day + "-" + month + "-" + year;
}

function formatIsoToDisplay(isoDate) {
  if (!isoDate) return "";
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  return m[3] + "-" + m[2] + "-" + m[1];
}

function findPatientById(id) {
  return patients.find(function (p) {
    return p.id === id;
  });
}

function extractHistoryValue(healthHistory, prefix) {
  if (!Array.isArray(healthHistory)) return "";
  const item = healthHistory.find(function (h) {
    return String(h).toLowerCase().startsWith(prefix.toLowerCase());
  });
  if (!item) return "";
  const idx = item.indexOf(":");
  return idx !== -1 ? item.slice(idx + 1).trim() : item;
}

function formatTimeTo12h(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hStr = parts[0];
  const mStr = parts[1];
  let h = Number(hStr);
  if (isNaN(h)) return timeStr;
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return h + ":" + (mStr || "00") + " " + suffix;
}

function getWhenToTakeText(med) {
  if (!med) return "—";
  const freqLower = String(med.frequency || "").toLowerCase();
  const rt = med.reminderTimes || {};
  const parts = [];
  if (freqLower.includes("morning")) {
    let part = "Morning";
    if (rt.morning) {
      part += " (" + formatTimeTo12h(rt.morning) + ")";
    }
    parts.push(part);
  }
  if (freqLower.includes("afternoon")) {
    let part = "Afternoon";
    if (rt.afternoon) {
      part += " (" + formatTimeTo12h(rt.afternoon) + ")";
    }
    parts.push(part);
  }
  if (freqLower.includes("night")) {
    let part = "Night";
    if (rt.night) {
      part += " (" + formatTimeTo12h(rt.night) + ")";
    }
    parts.push(part);
  }
  if (parts.length === 0) {
    return med.frequency || "—";
  }
  return parts.join(", ");
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Read medicine property from multiple possible keys (fixes different data shapes)
function readMedProp(medObj, keys) {
  if (!medObj) return "";
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (medObj[k] != null && medObj[k] !== "") return medObj[k];
  }
  return "";
}

// ---------- LOGIN / SIGNUP UI HANDLERS ----------

function showLoginView() {
  if (showLoginTabBtn) showLoginTabBtn.classList.add("active");
  if (showSignupTabBtn) showSignupTabBtn.classList.remove("active");
  const loginFormEl = document.querySelector(".auth-form-login");
  const signupFormEl = document.querySelector(".auth-form-signup");
  if (loginFormEl) loginFormEl.classList.remove("hidden");
  if (signupFormEl) signupFormEl.classList.add("hidden");
}

function showSignupView() {
  if (showSignupTabBtn) showSignupTabBtn.classList.add("active");
  if (showLoginTabBtn) showLoginTabBtn.classList.remove("active");
  const loginFormEl = document.querySelector(".auth-form-login");
  const signupFormEl = document.querySelector(".auth-form-signup");
  if (loginFormEl) loginFormEl.classList.add("hidden");
  if (signupFormEl) signupFormEl.classList.remove("hidden");
}

if (showLoginTabBtn) {
  showLoginTabBtn.addEventListener("click", function () {
    showLoginView();
  });
}
if (showSignupTabBtn) {
  showSignupTabBtn.addEventListener("click", function () {
    showSignupView();
  });
}

// ---------- AUTH-BASED LOGIN / SIGNUP ----------

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = loginIdInput.value.trim();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    if (globalLoading) globalLoading.classList.remove("hidden");
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle UI + Firestore listeners
    showToast("Logged in successfully");
  } catch (err) {
    console.error("Login error:", err);
    let msg = "Login failed. Please check your email and password.";
    if (err.code === "auth/user-not-found") {
      msg = "No account found with this email.";
    } else if (err.code === "auth/wrong-password") {
      msg = "Incorrect password.";
    } else if (err.code === "auth/invalid-email") {
      msg = "Invalid email format.";
    }
    alert(msg);
  } finally {
    if (globalLoading) globalLoading.classList.add("hidden");
  }
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const confirmPassword = signupConfirmPasswordInput.value;

  if (!name || !email || !password || !confirmPassword) {
    alert("Please fill all fields (Name, Email, Password, Confirm Password).");
    return;
  }
  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }
  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    if (globalLoading) globalLoading.classList.remove("hidden");

    // 1) Create auth user
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // 2) Save doctor profile in Firestore
    const profileRef = doc(doctorsColRef, user.uid);
    await setDoc(
      profileRef,
      {
        uid: user.uid,
        name: name,
        email: email,
        createdAt: serverTimestamp()
      },
      { merge: true }
    );

    // 3) Tell doctor to log in, switch back to login tab
    showToast("Account created. Please log in.");
    signupForm.reset();

    // Pre-fill email in login form for convenience
    if (loginIdInput) loginIdInput.value = email;

    // Show the Login tab again
    showLoginView();

    // 4) Make sure we are logged OUT after signup
    await signOut(auth);
  } catch (err) {
    console.error("Signup error:", err);
    let msg = "Failed to create account. Please try again.";
    if (err.code === "auth/email-already-in-use") {
      msg = "This email is already in use. Try logging in instead.";
    } else if (err.code === "auth/invalid-email") {
      msg = "Invalid email format.";
    } else if (err.code === "auth/weak-password") {
      msg = "Password is too weak.";
    }
    alert(msg);
  } finally {
    if (globalLoading) globalLoading.classList.add("hidden");
  }
}


// ---------- FIRESTORE (realtime) ----------
function setupRealtimePatientsListener() {
  // Clear previous listener if exists
  if (patientsUnsubscribe) {
    try {
      patientsUnsubscribe();
    } catch (e) {}
    patientsUnsubscribe = null;
  }

  // Must have a logged-in doctor to query patients
  if (!currentDoctor || !currentDoctor.uid) {
    patients = [];
    renderPatientsTable(patientSearchInput ? patientSearchInput.value : "");
    renderDashboard();
    renderIntakePatientsList();
    setSyncState("offline", "Not connected");
    return;
  }

  // Query only patients belonging to this doctor
  const q = query(patientsColRef, where("doctorId", "==", currentDoctor.uid));

  patientsUnsubscribe = onSnapshot(
    q,
    function (snap) {
      patients = [];
      snap.forEach(function (d) {
        const data = d.data();
        patients.push(
          Object.assign(
            {
              id: d.id
            },
            data
          )
        );
      });
      renderPatientsTable(patientSearchInput ? patientSearchInput.value : "");
      renderDashboard();
      renderIntakePatientsList();
      if (currentIntakePatientId) {
        renderIntakeDetailsForPatient(currentIntakePatientId);
      }
      setSyncState("online", "Synced");
    },
    function (err) {
      console.error("Realtime listener error:", err);
      showToast("Error loading patients");
      setSyncState("error", "Sync error");
    }
  );
}

function setupRealtimeIntakeListener() {
  if (intakeUnsubscribe) {
    try {
      intakeUnsubscribe();
    } catch (e) {}
    intakeUnsubscribe = null;
  }

  // keep listening to intakeLogs collection (we'll filter in UI to doctor's patients)
  intakeUnsubscribe = onSnapshot(
    intakeLogsColRef,
    function (snap) {
      intakeLogs = [];
      snap.forEach(function (d) {
        const data = d.data();
        intakeLogs.push(
          Object.assign(
            {
              id: d.id
            },
            data
          )
        );
      });
      // Update intake UI if the layout is visible
      renderIntakePatientsList();
      if (currentIntakePatientId) {
        renderIntakeDetailsForPatient(currentIntakePatientId);
      }
    },
    function (err) {
      console.error("Realtime intake listener error:", err);
    }
  );
}

function startRealtimeListeners() {
  setupRealtimePatientsListener();
  setupRealtimeIntakeListener();
}

async function addOrUpdatePatientInFirestore(patient, isNew) {
  const refDoc = doc(patientsColRef, patient.id);
  const dataToStore = Object.assign({}, patient, {
    id: patient.id,
    updatedAt: serverTimestamp(),
    // Ensure doctorId is set to current logged-in doctor
    doctorId: currentDoctor && currentDoctor.uid ? currentDoctor.uid : null
  });
  if (isNew) dataToStore.createdAt = serverTimestamp();
  await setDoc(refDoc, dataToStore, { merge: true });
}

async function deletePatientFromFirestore(id) {
  const refDoc = doc(patientsColRef, id);
  await deleteDoc(refDoc);
}

// ---------- RENDER PATIENT LIST + DETAILS ----------
function renderPatientsTable(filterText) {
  if (!patientsTableBody) return;
  if (filterText === undefined) filterText = "";
  const ft = filterText.trim().toLowerCase();
  let visiblePatients = patients;
  if (ft) {
    visiblePatients = patients.filter(function (p) {
      const name = (p.name || "").toLowerCase();
      const pid = (p.id || "").toLowerCase();
      return name.includes(ft) || pid.includes(ft);
    });
  }
  patientsTableBody.innerHTML = "";
  if (visiblePatients.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = ft
      ? "No patients found for this search."
      : "No patients added yet.";
    td.style.fontSize = "0.8rem";
    td.style.color = "#6b7280";
    tr.appendChild(td);
    patientsTableBody.appendChild(tr);
    selectedPatientId = null;
    renderPatientDetails(null);
  } else {
    visiblePatients.forEach(function (p) {
      const age = calculateAge(p.dob);
      const tr = document.createElement("tr");
      tr.dataset.id = p.id;
      tr.innerHTML =
        "<td>" +
        (p.id || "") +
        "</td>" +
        "<td>" +
        (p.name || "") +
        "</td>" +
        "<td>" +
        (age !== null ? age : "—") +
        "</td>" +
        "<td>" +
        (p.gender || "—") +
        "</td>" +
        "<td>" +
        (p.status || "Under Treatment") +
        "</td>" +
        "<td>" +
        (p.status &&
        p.status.toLowerCase() === "cured" &&
        p.curedInDays != null
          ? p.curedInDays
          : "—") +
        "</td>";
      tr.addEventListener("click", function () {
        selectPatient(p.id);
      });
      if (p.id === selectedPatientId) {
        tr.classList.add("selected");
      }
      patientsTableBody.appendChild(tr);
    });
    if (
      !visiblePatients.some(function (p) {
        return p.id === selectedPatientId;
      })
    ) {
      selectedPatientId = null;
      renderPatientDetails(null);
    }
  }
  if (totalPatientsEl) {
    totalPatientsEl.textContent = patients.length;
  }
  if (withMedsCountEl) {
    withMedsCountEl.textContent = patients.filter(function (p) {
      return Array.isArray(p.medicines) && p.medicines.length > 0;
    }).length;
  }
}

function renderPatientDetails(patient) {
  if (!noSelectionEl || !patientDetailsEl) return;
  if (!patient) {
    noSelectionEl.classList.remove("hidden");
    patientDetailsEl.classList.add("hidden");
    if (editPatientBtn) editPatientBtn.disabled = true;
    if (deletePatientBtn) deletePatientBtn.disabled = true;
    if (printPrescriptionBtn) printPrescriptionBtn.disabled = true;
    return;
  }
  noSelectionEl.classList.add("hidden");
  patientDetailsEl.classList.remove("hidden");
  if (editPatientBtn) editPatientBtn.disabled = false;
  if (deletePatientBtn) deletePatientBtn.disabled = false;
  if (printPrescriptionBtn) printPrescriptionBtn.disabled = false;

  let avatarChar = "P";
  if (patient.name && patient.name.length > 0) {
    avatarChar = patient.name.charAt(0).toUpperCase();
  }
  detailAvatar.textContent = avatarChar;
  detailName.textContent = patient.name;
  detailId.textContent = "Patient ID: " + patient.id;

  const age = calculateAge(patient.dob);
  detailAge.textContent = age !== null ? age + " years" : "—";
  detailGender.textContent = patient.gender || "—";
  detailHeight.textContent = patient.heightCm ? patient.heightCm + " cm" : "—";
  detailWeight.textContent = patient.weightKg ? patient.weightKg + " kg" : "—";
  detailDob.textContent = formatDate(patient.dob);
  detailStatus.textContent = patient.status || "Under Treatment";

  if (
    patient.status &&
    patient.status.toLowerCase() === "cured" &&
    patient.curedInDays != null
  ) {
    detailCuredIn.textContent = patient.curedInDays + " day(s)";
  } else {
    detailCuredIn.textContent = "—";
  }

  // History
  detailHistoryList.innerHTML = "";
  if (patient.healthHistory && patient.healthHistory.length > 0) {
    patient.healthHistory.forEach(function (h) {
      const li = document.createElement("li");
      li.textContent = h;
      detailHistoryList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No health history recorded.";
    detailHistoryList.appendChild(li);
  }

  // Medicines
  detailMedsBody.innerHTML = "";
  if (patient.medicines && patient.medicines.length > 0) {
    patient.medicines.forEach(function (m) {
      const whenText = getWhenToTakeText(m);
      const tr = document.createElement("tr");

      let datesDisplay = "—";
      if (Array.isArray(m.dates) && m.dates.length > 0) {
        datesDisplay = m.dates
          .map(function (d) {
            return formatIsoToDisplay(d);
          })
          .join(", ");
      } else if (m.days || m.duration) {
        datesDisplay = String(m.days || m.duration);
      }

      tr.innerHTML =
        "<td>" +
        (m.name || "") +
        "</td>" +
        "<td>" +
        (m.dosage || "") +
        "</td>" +
        "<td>" +
        whenText +
        "</td>" +
        "<td>" +
        datesDisplay +
        "</td>";
      detailMedsBody.appendChild(tr);
    });
  } else {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No medicines prescribed.";
    tr.appendChild(td);
    detailMedsBody.appendChild(tr);
  }
}

function selectPatient(id) {
  selectedPatientId = id;
  const patient = findPatientById(id);
  renderPatientDetails(patient);
  if (!patientsTableBody) return;
  Array.prototype.forEach.call(
    patientsTableBody.querySelectorAll("tr"),
    function (row) {
      row.classList.toggle("selected", row.dataset.id === id);
    }
  );
}

// ---------- ADD / EDIT PATIENT ----------
function clearPatientForm() {
  patientForm.reset();
  formMedsBody.innerHTML = "";
  editingPatientIdInput.value = "";
  formStatus.value = "Under Treatment";
  formCuredInDays.value = "";
  formCuredInDays.disabled = true;
  if (formDeviceId) formDeviceId.value = "";
}

function showAddPatientLayout() {
  if (homeScreen) homeScreen.classList.add("hidden");
  if (mainLayout) mainLayout.classList.add("hidden");
  if (dashboardLayout) dashboardLayout.classList.add("hidden");
  if (intakeLayout) intakeLayout.classList.add("hidden");
  if (addPatientLayout) addPatientLayout.classList.remove("hidden");
}

/**
 * closeAddPatientLayout()
 * Decides where to return based on lastOpenFrom:
 *  - 'patients' => show patients list only
 *  - 'dashboard' => show dashboard
 *  - 'home' => show home
 */
function closeAddPatientLayout() {
  if (addPatientLayout) addPatientLayout.classList.add("hidden");

  if (homeScreen) homeScreen.classList.add("hidden");
  if (mainLayout) mainLayout.classList.add("hidden");
  if (dashboardLayout) dashboardLayout.classList.add("hidden");
  if (intakeLayout) intakeLayout.classList.add("hidden");

  if (lastOpenFrom === "patients") {
    if (mainLayout) mainLayout.classList.remove("hidden");
  } else if (lastOpenFrom === "dashboard") {
    if (dashboardLayout) dashboardLayout.classList.remove("hidden");
  } else {
    if (homeScreen) homeScreen.classList.remove("hidden");
  }
}

function openPatientForm(mode, patient) {
  clearPatientForm();
  showAddPatientLayout();
  if (!lastOpenFrom) lastOpenFrom = "home";

  if (mode === "add") {
    addPageTitle.textContent = "Add Patient";
    addMedRow(); // default one med row
  } else if (mode === "edit" && patient) {
    addPageTitle.textContent = "Edit Patient";
    editingPatientIdInput.value = patient.id;
    formPatientId.value = patient.id;
    formPatientName.value = patient.name;
    formDob.value = patient.dob || "";
    formGender.value = patient.gender || "";
    formHeight.value = patient.heightCm != null ? patient.heightCm : "";
    formWeight.value = patient.weightKg != null ? patient.weightKg : "";

    formBpHistory.value = extractHistoryValue(
      patient.healthHistory,
      "bp history"
    );
    formDiabetic.value = extractHistoryValue(
      patient.healthHistory,
      "diabetic"
    );
    formSurgeries.value = extractHistoryValue(
      patient.healthHistory,
      "surgeries"
    );

    formStatus.value = patient.status || "Under Treatment";
    if (
      patient.status &&
      patient.status.toLowerCase() === "cured" &&
      patient.curedInDays != null
    ) {
      formCuredInDays.disabled = false;
      formCuredInDays.value = patient.curedInDays;
    } else {
      formCuredInDays.disabled = true;
      formCuredInDays.value = "";
    }

    if (formDeviceId) {
      formDeviceId.value = patient.deviceId || "";
    }

    // Populate medicine rows from patient.medicines OR use servo arrays for backward compat
    if (patient.medicines && patient.medicines.length > 0) {
      patient.medicines.forEach(function (m) {
        const medName = readMedProp(m, [
          "name",
          "medicine",
          "medName",
          "medicineName"
        ]);
        const medDosage = readMedProp(m, ["dosage", "dose", "qty", "quantity"]);
        let medDates = [];
        if (Array.isArray(m.dates) && m.dates.length > 0) {
          medDates = m.dates.slice();
        } else if (Array.isArray(m.date) && m.date.length > 0) {
          medDates = m.date.slice();
        } else if (m.days) {
          medDates = [String(m.days)];
        }

        const reminderTimes = m.reminderTimes || m.times || m.reminders || {};
        const frequency =
          m.frequency ||
          (reminderTimes && Object.keys(reminderTimes).length
            ? Object.keys(reminderTimes)
                .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
                .join(", ")
            : "");

        addMedRow({
          name: medName || "",
          dosage: medDosage || "",
          dates: medDates,
          reminderTimes: reminderTimes,
          frequency: frequency
        });
      });
    } else {
      // Backwards compatibility: create med rows from servo times if medicines not present
      const s1 = Array.isArray(patient.servo1Times) ? patient.servo1Times : [];
      const s2 = Array.isArray(patient.servo2Times) ? patient.servo2Times : [];
      const s3 = Array.isArray(patient.servo3Times) ? patient.servo3Times : [];

      function medFromServoTimes(servoTimes) {
        const rt = {};
        if (servoTimes[0]) rt.morning = servoTimes[0];
        if (servoTimes[1]) rt.afternoon = servoTimes[1];
        if (servoTimes[2]) rt.night = servoTimes[2];
        return {
          name: "",
          dosage: "",
          dates: [],
          reminderTimes: rt,
          frequency: Object.keys(rt).length
            ? Object.keys(rt)
                .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
                .join(", ")
            : ""
        };
      }

      addMedRow(medFromServoTimes(s1));
      addMedRow(medFromServoTimes(s2));
      addMedRow(medFromServoTimes(s3));
    }
  }
}

// ---------- MEDICINE ROW HANDLING ----------
function addMedRow(med) {
  const medName = med && med.name ? med.name : "";
  const medDosage = med && med.dosage ? med.dosage : "";
  let medDates = Array.isArray(med && med.dates) ? med.dates.slice() : [];

  const tr = document.createElement("tr");

  // medicine name cell
  const tdName = document.createElement("td");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "med-name";
  nameInput.placeholder = "Name";
  nameInput.value = medName;
  tdName.appendChild(nameInput);

  // dosage cell
  const tdDosage = document.createElement("td");
  const dosageInput = document.createElement("input");
  dosageInput.type = "text";
  dosageInput.className = "med-dosage";
  dosageInput.placeholder = "Dosage";
  dosageInput.value = medDosage;
  tdDosage.appendChild(dosageInput);

  // frequency/time cell
  const tdFreq = document.createElement("td");
  const freqWrapper = document.createElement("div");
  freqWrapper.className = "freq-wrapper";

  function createFreqRow(keyLabel, cbClass, timeClass, timeValue, checked) {
    const row = document.createElement("div");
    row.className = "freq-row";

    const label = document.createElement("label");
    label.style.userSelect = "none";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = cbClass;
    cb.checked = !!checked;

    const labelText = document.createElement("span");
    labelText.textContent = " " + keyLabel;

    label.appendChild(cb);
    label.appendChild(labelText);

    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.className = timeClass + " time-input";
    timeInput.value = timeValue || "";
    timeInput.disabled = !cb.checked;

    cb.addEventListener("change", function () {
      if (cb.checked) {
        timeInput.disabled = false;
        try {
          timeInput.focus();
        } catch (e) {}
      } else {
        timeInput.disabled = true;
        timeInput.value = "";
      }
    });

    row.appendChild(label);
    row.appendChild(timeInput);
    return row;
  }

  const rt = med && med.reminderTimes ? med.reminderTimes : {};
  const freqLower =
    med && med.frequency ? String(med.frequency).toLowerCase() : "";

  const morningChecked = rt.morning
    ? true
    : freqLower.includes("morning")
    ? true
    : false;
  const afternoonChecked = rt.afternoon
    ? true
    : freqLower.includes("afternoon")
    ? true
    : false;
  const nightChecked = rt.night
    ? true
    : freqLower.includes("night")
    ? true
    : false;

  const morningRow = createFreqRow(
    "Morning",
    "freq-morning",
    "freq-morning-time",
    rt.morning,
    morningChecked
  );
  const afternoonRow = createFreqRow(
    "Afternoon",
    "freq-afternoon",
    "freq-afternoon-time",
    rt.afternoon,
    afternoonChecked
  );
  const nightRow = createFreqRow(
    "Night",
    "freq-night",
    "freq-night-time",
    rt.night,
    nightChecked
  );

  freqWrapper.appendChild(morningRow);
  freqWrapper.appendChild(afternoonRow);
  freqWrapper.appendChild(nightRow);
  tdFreq.appendChild(freqWrapper);

  // date selection cell (calendar input + Add button + chips)
  const tdDates = document.createElement("td");

  const datePickWrap = document.createElement("div");
  datePickWrap.className = "meds-date-pick";

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className = "med-date";
  dateInput.placeholder = "Pick date";

  // Prevent manual typing/paste to enforce selection, but allow navigation keys
  dateInput.addEventListener("keydown", function (ev) {
    const allowed = [
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Enter",
      "Escape"
    ];
    if (allowed.includes(ev.key)) return;
    ev.preventDefault();
  });
  dateInput.addEventListener("paste", function (ev) {
    ev.preventDefault();
  });

  const addDateBtn = document.createElement("button");
  addDateBtn.type = "button";
  addDateBtn.className = "btn add-date";
  addDateBtn.textContent = "Add";

  const chipsWrap = document.createElement("div");
  chipsWrap.className = "date-chips";

  function renderDateChips() {
    chipsWrap.innerHTML = "";
    medDates.forEach(function (d) {
      const chip = document.createElement("span");
      chip.className = "date-chip";
      chip.textContent = formatIsoToDisplay(d);

      const rem = document.createElement("span");
      rem.className = "remove-date";
      rem.textContent = "×";
      rem.title = "Remove date";
      rem.addEventListener("click", function () {
        const idx = medDates.indexOf(d);
        if (idx !== -1) medDates.splice(idx, 1);
        renderDateChips();
      });

      chip.appendChild(rem);
      chipsWrap.appendChild(chip);
    });
  }

  addDateBtn.addEventListener("click", function () {
    const v = dateInput.value && String(dateInput.value).trim();
    if (!v) {
      alert("Pick a date from the calendar first.");
      return;
    }
    if (!medDates.includes(v)) {
      medDates.push(v);
      medDates.sort();
      renderDateChips();
    } else {
      showToast("Date already added");
    }
    try {
      dateInput.value = "";
    } catch (e) {}
  });

  if (medDates && medDates.length > 0) {
    for (let i = 0; i < medDates.length; i++) {
      const item = String(medDates[i]);
      const dmy = item.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      const iso = item.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dmy) {
        medDates[i] = dmy[3] + "-" + dmy[2] + "-" + dmy[1];
      } else if (iso) {
        medDates[i] = item;
      } else {
        medDates[i] = item;
      }
    }
    medDates = Array.from(new Set(medDates)).sort();
    renderDateChips();
  }

  datePickWrap.appendChild(dateInput);
  datePickWrap.appendChild(addDateBtn);

  tdDates.appendChild(datePickWrap);
  tdDates.appendChild(chipsWrap);

  // delete cell
  const tdDel = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-med-row-btn";
  deleteBtn.innerHTML = "&times;";
  deleteBtn.addEventListener("click", function () {
    tr.remove();
  });
  tdDel.appendChild(deleteBtn);

  tr.appendChild(tdName);
  tr.appendChild(tdDosage);
  tr.appendChild(tdFreq);
  tr.appendChild(tdDates);
  tr.appendChild(tdDel);

  // attach medDates array to the tr element for easier collection later
  tr._medDates = medDates;

  formMedsBody.appendChild(tr);
}

/**
 * collectMedicinesFromForm - collects meds and validates them.
 * Returns: { valid: boolean, meds: Array, errors: Array<string> }
 */
function collectMedicinesFromForm() {
  const rows = formMedsBody.querySelectorAll("tr");
  const meds = [];
  const errors = [];
  rows.forEach(function (row, idx) {
    const rowIndex = idx + 1;
    const nameEl = row.querySelector(".med-name");
    const dosageEl = row.querySelector(".med-dosage");

    const name = nameEl ? nameEl.value.trim() : "";
    const dosage = dosageEl ? dosageEl.value.trim() : "";

    const datesArray = Array.isArray(row._medDates)
      ? row._medDates.slice()
      : [];

    const morningCb = row.querySelector(".freq-morning");
    const afternoonCb = row.querySelector(".freq-afternoon");
    const nightCb = row.querySelector(".freq-night");
    const morning = !!(morningCb && morningCb.checked);
    const afternoon = !!(afternoonCb && afternoonCb.checked);
    const night = !!(nightCb && nightCb.checked);

    const morningTimeEl = row.querySelector(".freq-morning-time");
    const afternoonTimeEl = row.querySelector(".freq-afternoon-time");
    const nightTimeEl = row.querySelector(".freq-night-time");
    const morningTime = morningTimeEl ? morningTimeEl.value.trim() : "";
    const afternoonTime = afternoonTimeEl ? afternoonTimeEl.value.trim() : "";
    const nightTime = nightTimeEl ? nightTimeEl.value.trim() : "";

    const isRowEmpty =
      !name &&
      !dosage &&
      (!datesArray || datesArray.length === 0) &&
      !morning &&
      !afternoon &&
      !night;
    if (isRowEmpty) {
      return;
    }

    if (!name) {
      errors.push("Medicine row " + rowIndex + ": name is required.");
    }
    if (!datesArray || datesArray.length === 0) {
      errors.push(
        "Medicine row " +
          rowIndex +
          ": add at least one date using the calendar + Add button."
      );
    }
    if (!morning && !afternoon && !night) {
      errors.push(
        "Medicine row " +
          rowIndex +
          ": select at least one period (Morning/Afternoon/Night)."
      );
    } else {
      if (morning && !morningTime) {
        errors.push(
          "Medicine row " +
            rowIndex +
            ": Morning checked but time is missing."
        );
      }
      if (afternoon && !afternoonTime) {
        errors.push(
          "Medicine row " +
            rowIndex +
            ": Afternoon checked but time is missing."
        );
      }
      if (night && !nightTime) {
        errors.push(
          "Medicine row " + rowIndex + ": Night checked but time is missing."
        );
      }
    }

    const freqParts = [];
    if (morning) freqParts.push("Morning");
    if (afternoon) freqParts.push("Afternoon");
    if (night) freqParts.push("Night");
    const frequency = freqParts.join(", ");

    const medObj = {
      name: name,
      dosage: dosage,
      frequency: frequency,
      dates: datesArray
    };
    if (morning || afternoon || night) {
      medObj.reminderTimes = {
        morning: morning ? morningTime || null : null,
        afternoon: afternoon ? afternoonTime || null : null,
        night: night ? nightTime || null : null
      };
    }
    meds.push(medObj);
  });

  const valid = errors.length === 0;
  return { valid, meds, errors };
}

function deriveServoTimesFromMeds(meds) {
  function timesFromMed(med) {
    if (!med || !med.reminderTimes) return [];
    const rt = med.reminderTimes;
    const arr = [];
    if (rt.morning) arr.push(rt.morning);
    if (rt.afternoon) arr.push(rt.afternoon);
    if (rt.night) arr.push(rt.night);
    return arr;
  }
  const servo1Times = timesFromMed(meds[0]);
  const servo2Times = timesFromMed(meds[1]);
  const servo3Times = timesFromMed(meds[2]);
  return { servo1Times, servo2Times, servo3Times };
}

function deriveServoDatesFromMeds(meds) {
  function datesFromMed(med) {
    if (!med || !Array.isArray(med.dates)) return [];
    return med.dates.slice();
  }
  const servo1Dates = datesFromMed(meds[0]);
  const servo2Dates = datesFromMed(meds[1]);
  const servo3Dates = datesFromMed(meds[2]);
  return { servo1Dates, servo2Dates, servo3Dates };
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const total = patients.length;
  const withMeds = patients.filter(function (p) {
    return Array.isArray(p.medicines) && p.medicines.length > 0;
  }).length;
  const male = patients.filter(function (p) {
    return (p.gender || "").toLowerCase() === "male";
  }).length;
  const female = patients.filter(function (p) {
    return (p.gender || "").toLowerCase() === "female";
  }).length;
  const other = total - male - female;
  const withBp = patients.filter(function (p) {
    return (
      Array.isArray(p.healthHistory) &&
      p.healthHistory.some(function (h) {
        return String(h).toLowerCase().startsWith("bp history");
      })
    );
  }).length;
  const diabetic = patients.filter(function (p) {
    if (!Array.isArray(p.healthHistory)) return false;
    const item = p.healthHistory.find(function (h) {
      return String(h).toLowerCase().startsWith("diabetic");
    });
    if (!item) return false;
    return !item.toLowerCase().includes("no");
  }).length;
  const cured = patients.filter(function (p) {
    return (p.status || "").toLowerCase() === "cured";
  }).length;

  if (dashTotalPatients) dashTotalPatients.textContent = total;
  if (dashWithMeds) dashWithMeds.textContent = withMeds;
  if (dashMalePatients) dashMalePatients.textContent = male;
  if (dashFemalePatients) dashFemalePatients.textContent = female;
  if (dashOtherPatients) dashOtherPatients.textContent = other;
  if (dashWithBpHistory) dashWithBpHistory.textContent = withBp;
  if (dashDiabeticPatients) dashDiabeticPatients.textContent = diabetic;
  if (dashCuredPatients) dashCuredPatients.textContent = cured;
}

// ---------- INTAKE STATS & ADHERENCE ----------
function computeAdherenceForPatient(patientId) {
  // Only consider logs that belong to this patient's id
  const logs = intakeLogs.filter(function (l) {
    return l.patientId === patientId;
  });
  const total = logs.length;
  if (total === 0) {
    return { total: 0, taken: 0, missed: 0, percent: 0 };
  }
  let taken = 0;
  let missed = 0;
  logs.forEach(function (l) {
    const raw =
      l.status ||
      (l.taken === true ? "taken" : l.taken === false ? "missed" : "");
    const status = String(raw || "").toLowerCase();
    if (status === "taken") taken++;
    else if (status === "missed") missed++;
  });
  const percent = total ? Math.round((taken / total) * 100) : 0;
  return { total, taken, missed, percent };
}

function renderIntakePatientsList() {
  if (!intakePatientsBody) return;
  intakePatientsBody.innerHTML = "";
  if (patients.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "No patients added yet.";
    td.style.fontSize = "0.8rem";
    td.style.color = "#6b7280";
    tr.appendChild(td);
    intakePatientsBody.appendChild(tr);
    return;
  }

  // Only loop through patients assigned to the current doctor (patients array already filtered)
  patients.forEach(function (p) {
    const stats = computeAdherenceForPatient(p.id);
    const tr = document.createElement("tr");
    tr.dataset.id = p.id;
    tr.innerHTML =
      "<td>" +
      (p.id || "") +
      "</td>" +
      "<td>" +
      (p.name || "") +
      "</td>" +
      "<td>" +
      stats.percent +
      "%" +
      "</td>";
    tr.addEventListener("click", function () {
      selectIntakePatient(p.id);
    });
    if (p.id === currentIntakePatientId) {
      tr.classList.add("selected");
    }
    intakePatientsBody.appendChild(tr);
  });
}

function renderIntakeDetailsForPatient(patientId) {
  if (
    !intakeSelectedName ||
    !intakeSelectedId ||
    !intakeTotalEvents ||
    !intakeEventsBody
  ) {
    return;
  }

  if (!patientId) {
    intakeSelectedName.textContent = "No patient selected";
    intakeSelectedId.textContent = "Choose a patient on the left to see logs.";
    intakeTotalEvents.textContent = "0";
    intakeTakenCount.textContent = "0";
    intakeMissedCount.textContent = "0";
    intakeAdherencePercent.textContent = "0%";
    intakeEventsBody.innerHTML = "";
    return;
  }

  const patient = findPatientById(patientId);
  if (!patient) {
    intakeSelectedName.textContent = "No patient selected";
    intakeSelectedId.textContent = "Choose a patient on the left to see logs.";
    intakeTotalEvents.textContent = "0";
    intakeTakenCount.textContent = "0";
    intakeMissedCount.textContent = "0";
    intakeAdherencePercent.textContent = "0%";
    intakeEventsBody.innerHTML = "";
    return;
  }

  intakeSelectedName.textContent = patient.name || "(No name)";
  intakeSelectedId.textContent = "Patient ID: " + (patient.id || "-");

  const stats = computeAdherenceForPatient(patient.id);
  intakeTotalEvents.textContent = stats.total;
  intakeTakenCount.textContent = stats.taken;
  intakeMissedCount.textContent = stats.missed;
  intakeAdherencePercent.textContent = stats.percent + "%";

  const logs = intakeLogs
    .filter(function (l) {
      return l.patientId === patient.id;
    })
    .slice();

  logs.sort(function (a, b) {
    const da = a.date || a.dateString || "";
    const db = b.date || b.dateString || "";
    if (da === db) {
      return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
    }
    return da.localeCompare(db);
  });

  intakeEventsBody.innerHTML = "";
  if (logs.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent =
      "No intake logs available for this patient yet.";
    td.style.fontSize = "0.8rem";
    td.style.color = "#6b7280";
    tr.appendChild(td);
    intakeEventsBody.appendChild(tr);
    return;
  }

  logs.forEach(function (log) {
    const tr = document.createElement("tr");

    const dateDisp = log.date || log.dateString || "-";
    const sched = log.scheduledTime || "-";

    // Map servo/slot to medicine name if possible
    let servo =
      log.servo != null
        ? String(log.servo)
        : log.slot != null
        ? String(log.slot)
        : "-";

    let medicineName = servo;
    const patientMeds = patient.medicines || [];
    if (patientMeds && patientMeds.length > 0) {
      let index = -1;
      if (servo === "1" || servo === "servo1") index = 0;
      else if (servo === "2" || servo === "servo2") index = 1;
      else if (servo === "3" || servo === "servo3") index = 2;

      if (index >= 0 && index < patientMeds.length) {
        const med = patientMeds[index];
        const medName =
          med && (med.name || med.medicine || med.medName || med.medicineName);
        if (medName) {
          medicineName = medName + " (Slot " + servo + ")";
        }
      }
    }

    const rawStatus =
      log.status ||
      (log.taken === true ? "Taken" : log.taken === false ? "Missed" : "");
    const statusLower = String(rawStatus || "").toLowerCase();

    let statusLabel = "Unknown";
    let badgeHtml = "-";
    if (statusLower === "taken") {
      statusLabel = "Taken";
      badgeHtml =
        '<span class="badge badge-intake-taken">' + statusLabel + "</span>";
    } else if (statusLower === "missed") {
      statusLabel = "Missed";
      badgeHtml =
        '<span class="badge badge-intake-missed">' + statusLabel + "</span>";
    } else {
      badgeHtml = rawStatus ? escapeHtml(String(rawStatus)) : "-";
    }

    const takenAt = log.takenAt || log.takenTime || "-";

    tr.innerHTML =
      "<td>" +
      escapeHtml(dateDisp) +
      "</td>" +
      "<td>" +
      escapeHtml(sched) +
      "</td>" +
      "<td>" +
      escapeHtml(medicineName) +
      "</td>" +
      "<td>" +
      badgeHtml +
      "</td>" +
      "<td>" +
      escapeHtml(takenAt) +
      "</td>";

    intakeEventsBody.appendChild(tr);
  });
}

function selectIntakePatient(id) {
  currentIntakePatientId = id;
  renderIntakeDetailsForPatient(id);
  if (!intakePatientsBody) return;
  Array.prototype.forEach.call(
    intakePatientsBody.querySelectorAll("tr"),
    function (row) {
      row.classList.toggle("selected", row.dataset.id === id);
    }
  );
}

// ---------- PRINTABLE PRESCRIPTION ----------
function openPrescriptionPrintWindow(patient) {
  if (!patient) return;
  const today = new Date();
  const dateStr = today.toLocaleDateString();
  const age = calculateAge(patient.dob);
  const ageText = age !== null ? age + " years" : "—";
  const dobText = formatDate(patient.dob);
  const statusText = patient.status || "Under Treatment";
  const curedInText =
    patient.status &&
    patient.status.toLowerCase() === "cured" &&
    patient.curedInDays != null
      ? patient.curedInDays + " day(s)"
      : "-";
  let historyHtml = "";
  if (patient.healthHistory && patient.healthHistory.length > 0) {
    historyHtml =
      "<ul>" +
      patient.healthHistory
        .map(function (h) {
          return "<li>" + escapeHtml(h) + "</li>";
        })
        .join("") +
      "</ul>";
  } else {
    historyHtml = "<p>No specific history recorded.</p>";
  }
  let medsRows = "";
  if (patient.medicines && patient.medicines.length > 0) {
    patient.medicines.forEach(function (m) {
      const whenText = escapeHtml(getWhenToTakeText(m));
      let dateDisplay = "-";
      if (Array.isArray(m.dates) && m.dates.length > 0) {
        dateDisplay = m.dates
          .map(function (d) {
            return escapeHtml(formatIsoToDisplay(d));
          })
          .join(", ");
      } else if (m.days || m.duration) {
        dateDisplay = escapeHtml(String(m.days || m.duration));
      }
      medsRows +=
        "<tr>" +
        "<td>" +
        escapeHtml(m.name || "") +
        "</td>" +
        "<td>" +
        escapeHtml(m.dosage || "") +
        "</td>" +
        "<td>" +
        whenText +
        "</td>" +
        "<td>" +
        dateDisplay +
        "</td>" +
        "</tr>";
    });
  } else {
    medsRows =
      '<tr><td colspan="4" style="text-align:center; font-size:0.8rem; color:#6b7280;">' +
      "No medicines prescribed." +
      "</td></tr>";
  }

  const doctorDisplayName = currentDoctorName || "Doctor";

  const win = window.open("", "_blank");
  if (!win) {
    alert(
      "Popup blocked. Please allow popups for this site to print prescription."
    );
    return;
  }
  win.document.write(
    "<!DOCTYPE html>" +
      "<html>" +
      "<head>" +
      '<meta charset="UTF-8" />' +
      "<title>Prescription - " +
      escapeHtml(patient.name || "") +
      " (" +
      escapeHtml(patient.id || "") +
      ")</title>" +
      "<style>" +
      "body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; color: #111827; }" +
      ".prescription-container { max-width: 700px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 16px 18px; border-radius: 10px; }" +
      ".header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }" +
      ".clinic-name { font-size: 1.2rem; font-weight: 700; color: #2563eb; }" +
      ".clinic-sub { font-size: 0.85rem; color: #6b7280; }" +
      ".doc-block { text-align: right; font-size: 0.85rem; }" +
      ".doc-name { font-weight: 600; }" +
      ".section-title { font-size: 0.95rem; font-weight: 600; margin-top: 10px; margin-bottom: 4px; }" +
      ".patient-info { font-size: 0.85rem; border-bottom: 1px dashed #e5e7eb; padding-bottom: 6px; margin-bottom: 6px; }" +
      ".patient-info span { display: inline-block; margin-right: 12px; margin-bottom: 2px; }" +
      ".history-block { font-size: 0.85rem; margin-bottom: 6px; }" +
      ".history-block ul { margin-top: 2px; padding-left: 18px; }" +
      ".history-block li { margin-bottom: 2px; }" +
      "table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 4px; }" +
      "th, td { border: 1px solid #e5e7eb; padding: 4px 6px; text-align: left; }" +
      "th { background: #eff6ff; }" +
      ".footer-note { font-size: 0.8rem; color: #6b7280; margin-top: 10px; }" +
      ".sign-row { margin-top: 18px; display: flex; justify-content: flex-end; font-size: 0.85rem; }" +
      "@media print { body { margin: 0; } .prescription-container { border: none; border-radius: 0; } }" +
      "</style>" +
      "</head>" +
      "<body>" +
      '<div class="prescription-container">' +
      '<div class="header-row">' +
      "<div>" +
      '<div class="clinic-name">CareConnect Hospital</div>' +
      '<div class="clinic-sub">Smart Prescription & Patient Care System</div>' +
      "</div>" +
      '<div class="doc-block">' +
      '<div class="doc-name">' +
      escapeHtml(doctorDisplayName) +
      "</div>" +
      "<div>Reg. No: CC-001</div>" +
      "<div>Date: " +
      dateStr +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="section-title">Patient Information</div>' +
      '<div class="patient-info">' +
      "<span><strong>Name:</strong> " +
      escapeHtml(patient.name || "-") +
      "</span>" +
      "<span><strong>ID:</strong> " +
      escapeHtml(patient.id || "-") +
      "</span><br/>" +
      "<span><strong>Age:</strong> " +
      ageText +
      "</span>" +
      "<span><strong>Gender:</strong> " +
      escapeHtml(patient.gender || "-") +
      "</span>" +
      "<span><strong>Status:</strong> " +
      escapeHtml(statusText) +
      "</span>" +
      "<span><strong>Cured In:</strong> " +
      escapeHtml(curedInText) +
      "</span>" +
      "<br/>" +
      "<span><strong>DOB:</strong> " +
      escapeHtml(dobText) +
      "</span>" +
      "<span><strong>Height:</strong> " +
      (patient.heightCm
        ? escapeHtml(patient.heightCm + " cm")
        : "-") +
      "</span>" +
      "<span><strong>Weight:</strong> " +
      (patient.weightKg
        ? escapeHtml(patient.weightKg + " kg")
        : "-") +
      "</span>" +
      "</div>" +
      '<div class="section-title">Health History</div>' +
      '<div class="history-block">' +
      historyHtml +
      "</div>" +
      '<div class="section-title">Prescription</div>' +
      "<table>" +
      "<thead>" +
      "<tr>" +
      "<th>Medicine</th>" +
      "<th>Dosage</th>" +
      "<th>When to Take</th>" +
      "<th>Dates</th>" +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      medsRows +
      "</tbody>" +
      "</table>" +
      '<div class="footer-note">' +
      "Note: Please follow the above schedule strictly. Contact your doctor if you experience any side effects or changes in your condition." +
      "</div>" +
      '<div class="sign-row">' +
      "<div>_<br/>Doctor's Signature</div>" +
      "</div>" +
      "</div>" +
      "<script>window.print();</script>" +
      "</body>" +
      "</html>"
  );
  win.document.close();
  win.focus();
}

// ---------- EVENT LISTENERS ----------

// Login & Signup
if (loginForm) {
  loginForm.addEventListener("submit", handleLoginSubmit);
}
if (signupForm) {
  signupForm.addEventListener("submit", handleSignupSubmit);
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    signOut(auth)
      .then(function () {
        showToast("Logged out");
      })
      .catch(function (err) {
        console.error("Logout error:", err);
        alert("Failed to log out. See console for details.");
      });
  });
}

if (homeViewDetailsBtn) {
  homeViewDetailsBtn.addEventListener("click", function () {
    if (homeScreen) homeScreen.classList.add("hidden");
    if (dashboardLayout) dashboardLayout.classList.add("hidden");
    if (intakeLayout) intakeLayout.classList.add("hidden");
    if (addPatientLayout) addPatientLayout.classList.add("hidden");
    if (mainLayout) mainLayout.classList.remove("hidden");
  });
}

if (homeAddPatientBtn) {
  homeAddPatientBtn.addEventListener("click", function () {
    lastOpenFrom = "home";
    openPatientForm("add");
  });
}

if (homeDashboardBtn) {
  homeDashboardBtn.addEventListener("click", function () {
    if (homeScreen) homeScreen.classList.add("hidden");
    if (mainLayout) mainLayout.classList.add("hidden");
    if (intakeLayout) intakeLayout.classList.add("hidden");
    if (addPatientLayout) addPatientLayout.classList.add("hidden");
    if (dashboardLayout) dashboardLayout.classList.remove("hidden");
    renderDashboard();
  });
}

if (homeIntakeStatsBtn) {
  homeIntakeStatsBtn.addEventListener("click", function () {
    if (homeScreen) homeScreen.classList.add("hidden");
    if (mainLayout) mainLayout.classList.add("hidden");
    if (dashboardLayout) dashboardLayout.classList.add("hidden");
    if (addPatientLayout) addPatientLayout.classList.add("hidden");
    if (intakeLayout) intakeLayout.classList.remove("hidden");
    currentIntakePatientId = null;
    renderIntakePatientsList();
    renderIntakeDetailsForPatient(null);
  });
}

if (backHomeBtn) {
  backHomeBtn.addEventListener("click", function () {
    if (mainLayout) mainLayout.classList.add("hidden");
    if (dashboardLayout) dashboardLayout.classList.add("hidden");
    if (intakeLayout) intakeLayout.classList.add("hidden");
    if (addPatientLayout) addPatientLayout.classList.add("hidden");
    if (homeScreen) homeScreen.classList.remove("hidden");
    selectedPatientId = null;
    renderPatientDetails(null);
    if (patientsTableBody) {
      Array.prototype.forEach.call(
        patientsTableBody.querySelectorAll("tr"),
        function (row) {
          row.classList.remove("selected");
        }
      );
    }
  });
}

if (backHomeFromDashboardBtn) {
  backHomeFromDashboardBtn.addEventListener("click", function () {
    if (mainLayout) mainLayout.classList.add("hidden");
    if (addPatientLayout) addPatientLayout.classList.add("hidden");
    if (intakeLayout) intakeLayout.classList.add("hidden");
    if (dashboardLayout) dashboardLayout.classList.add("hidden");
    if (homeScreen) homeScreen.classList.remove("hidden");
  });
}

if (backHomeFromIntakeBtn) {
  backHomeFromIntakeBtn.addEventListener("click", function () {
    if (mainLayout) mainLayout.classList.add("hidden");
    if (addPatientLayout) addPatientLayout.classList.add("hidden");
    if (dashboardLayout) dashboardLayout.classList.add("hidden");
    if (intakeLayout) intakeLayout.classList.add("hidden");
    if (homeScreen) homeScreen.classList.remove("hidden");
  });
}

if (backFromAddBtn) {
  backFromAddBtn.addEventListener("click", function () {
    closeAddPatientLayout();
  });
}

if (cancelAddBtn) {
  cancelAddBtn.addEventListener("click", function () {
    closeAddPatientLayout();
  });
}

if (patientSearchInput) {
  patientSearchInput.addEventListener("input", function () {
    renderPatientsTable(patientSearchInput.value);
  });
}

// Add patient button on the Patients list -> opened from 'patients'
if (addPatientBtn) {
  addPatientBtn.addEventListener("click", function () {
    lastOpenFrom = "patients";
    openPatientForm("add");
  });
}

if (editPatientBtn) {
  editPatientBtn.addEventListener("click", function () {
    if (!selectedPatientId) return;
    const patient = findPatientById(selectedPatientId);
    if (!patient) return;
    lastOpenFrom = "patients";
    openPatientForm("edit", patient);
  });
}

// Use custom modal instead of window.confirm
if (deletePatientBtn) {
  deletePatientBtn.addEventListener("click", function () {
    if (!selectedPatientId) return;
    const patient = findPatientById(selectedPatientId);
    if (!patient) return;
    pendingDeletePatientId = selectedPatientId;
    if (confirmDeleteModal) {
      confirmDeleteModal.classList.remove("hidden");
    }
  });
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", function () {
    pendingDeletePatientId = null;
    if (confirmDeleteModal)
      confirmDeleteModal.classList.add("hidden");
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async function () {
    if (!pendingDeletePatientId) {
      if (confirmDeleteModal)
        confirmDeleteModal.classList.add("hidden");
      return;
    }
    try {
      await deletePatientFromFirestore(pendingDeletePatientId);
      showToast("Patient deleted");
      if (selectedPatientId === pendingDeletePatientId) {
        selectedPatientId = null;
        renderPatientDetails(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete patient. See console.");
    } finally {
      pendingDeletePatientId = null;
      if (confirmDeleteModal)
        confirmDeleteModal.classList.add("hidden");
    }
  });
}

// close modal if click on dark background
if (confirmDeleteModal) {
  confirmDeleteModal.addEventListener("click", function (e) {
    if (e.target === confirmDeleteModal) {
      pendingDeletePatientId = null;
      confirmDeleteModal.classList.add("hidden");
    }
  });
}

if (printPrescriptionBtn) {
  printPrescriptionBtn.addEventListener("click", function () {
    if (!selectedPatientId) return;
    const patient = findPatientById(selectedPatientId);
    if (!patient) return;
    openPrescriptionPrintWindow(patient);
  });
}

if (addMedRowBtn) {
  addMedRowBtn.addEventListener("click", function () {
    addMedRow();
  });
}

if (formStatus) {
  formStatus.addEventListener("change", function () {
    if (formStatus.value === "Cured") {
      formCuredInDays.disabled = false;
    } else {
      formCuredInDays.disabled = true;
      formCuredInDays.value = "";
    }
  });
}

// ---------- PATIENT FORM SUBMIT ----------
if (patientForm) {
  patientForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    savePatientBtn.disabled = true;

    const id = formPatientId.value.trim();
    const name = formPatientName.value.trim();
    const dob = formDob.value;
    const gender = formGender.value;
    const heightCm = formHeight.value ? Number(formHeight.value) : null;
    const weightKg = formWeight.value ? Number(formWeight.value) : null;

    if (!id || !name || !dob || !gender) {
      alert("Please fill Patient ID, Name, DOB and Gender.");
      savePatientBtn.disabled = false;
      return;
    }

    const hp = formBpHistory.value.trim();
    const hd = formDiabetic.value.trim();
    const hs = formSurgeries.value.trim();
    const healthHistory = [];
    if (hp) healthHistory.push("BP history: " + hp);
    if (hd) healthHistory.push("Diabetic: " + hd);
    if (hs) healthHistory.push("Surgeries: " + hs);

    const status = formStatus.value || "Under Treatment";
    let curedInDays = null;
    if (status === "Cured" && formCuredInDays.value) {
      curedInDays = Number(formCuredInDays.value);
    }

    const collected = collectMedicinesFromForm();
    if (!collected.valid) {
      alert(
        "Fix medicine errors before saving:\n\n" + collected.errors.join("\n")
      );
      savePatientBtn.disabled = false;
      return;
    }

    const medicines = collected.meds;

    const { servo1Times, servo2Times, servo3Times } =
      deriveServoTimesFromMeds(medicines);
    const { servo1Dates, servo2Dates, servo3Dates } =
      deriveServoDatesFromMeds(medicines);

    const deviceId = formDeviceId ? formDeviceId.value.trim() : "";

    const editingId = editingPatientIdInput.value;
    const isNew = !editingId;
    if (
      isNew &&
      patients.some(function (p) {
        return p.id === id;
      })
    ) {
      alert("A patient with this ID already exists.");
      savePatientBtn.disabled = false;
      return;
    }

    const patient = {
      id: id,
      name: name,
      dob: dob,
      gender: gender,
      heightCm: heightCm,
      weightKg: weightKg,
      healthHistory: healthHistory,
      medicines: medicines,
      status: status,
      curedInDays: curedInDays,
      deviceId: deviceId || null,
      servo1Times: servo1Times,
      servo2Times: servo2Times,
      servo3Times: servo3Times,
      servo1Dates: servo1Dates,
      servo2Dates: servo2Dates,
      servo3Dates: servo3Dates,
      // ensure doctorId is present
      doctorId: currentDoctor && currentDoctor.uid ? currentDoctor.uid : null
    };

    try {
      await addOrUpdatePatientInFirestore(patient, isNew);

      if (deviceId) {
        const devRef = doc(devicesColRef, deviceId);
        await setDoc(
          devRef,
          {
            id: deviceId,
            patientId: id,
            servo1Times: servo1Times,
            servo2Times: servo2Times,
            servo3Times: servo3Times,
            servo1Dates: servo1Dates,
            servo2Dates: servo2Dates,
            servo3Dates: servo3Dates,
            doctorId: currentDoctor && currentDoctor.uid ? currentDoctor.uid : null,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }

      showToast(isNew ? "Patient added" : "Patient updated");
      closeAddPatientLayout();
      savePatientBtn.disabled = false;
    } catch (err) {
      console.error(err);
      alert("Failed to save patient. See console for details.");
      savePatientBtn.disabled = false;
    }
  });
}

// ---------- AUTH STATE + UI ----------

function setLoggedInUI(doctorName) {
  currentDoctorName = doctorName || currentDoctorName || "Doctor";
  if (doctorNameLabel) {
    doctorNameLabel.textContent = currentDoctorName;
  }

  if (loginScreen) loginScreen.classList.add("hidden");
  if (topbar) topbar.classList.remove("hidden");

  if (homeScreen) homeScreen.classList.remove("hidden");
  if (mainLayout) mainLayout.classList.add("hidden");
  if (dashboardLayout) dashboardLayout.classList.add("hidden");
  if (intakeLayout) intakeLayout.classList.add("hidden");
  if (addPatientLayout) addPatientLayout.classList.add("hidden");

  setSyncState("online", "Online");
}

function setLoggedOutUI() {
  selectedPatientId = null;
  currentIntakePatientId = null;
  currentDoctor = null;
  currentDoctorName = "Doctor";

  // unsubscribe realtime listeners
  if (patientsUnsubscribe) {
    try {
      patientsUnsubscribe();
    } catch (e) {}
    patientsUnsubscribe = null;
  }
  if (intakeUnsubscribe) {
    try {
      intakeUnsubscribe();
    } catch (e) {}
    intakeUnsubscribe = null;
  }

  patients = [];
  intakeLogs = [];

  // Clear UI lists
  renderPatientsTable("");
  renderDashboard();
  renderIntakePatientsList();
  renderIntakeDetailsForPatient(null);
  renderPatientDetails(null);

  if (topbar) topbar.classList.add("hidden");
  if (homeScreen) homeScreen.classList.add("hidden");
  if (mainLayout) mainLayout.classList.add("hidden");
  if (dashboardLayout) dashboardLayout.classList.add("hidden");
  if (intakeLayout) intakeLayout.classList.add("hidden");
  if (addPatientLayout) addPatientLayout.classList.add("hidden");

  if (loginScreen) loginScreen.classList.remove("hidden");
  if (loginForm) loginForm.reset();
  if (signupForm) signupForm.reset();

  // reset auth tabs to login
  showLoginView();

  setSyncState("offline", "Not connected");
}

async function handleAuthStateChange(user) {
  if (user) {
    currentDoctor = user;
    try {
      if (globalLoading) globalLoading.classList.remove("hidden");
      const ref = doc(doctorsColRef, user.uid);
      const snap = await getDoc(ref);
      let nameToUse = user.email || "Doctor";
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.name) {
          nameToUse = data.name;
        }
      }
      setLoggedInUI(nameToUse);
      // Start listeners now that currentDoctor is set
      startRealtimeListeners();
    } catch (err) {
      console.error("Failed to load doctor profile:", err);
      setLoggedInUI(user.email || "Doctor");
      startRealtimeListeners();
    } finally {
      if (globalLoading) globalLoading.classList.add("hidden");
    }
  } else {
    setLoggedOutUI();
  }
}

// ---------- INIT ----------
function init() {
  try {
    setLoggedOutUI();
    onAuthStateChanged(auth, handleAuthStateChange);
  } catch (err) {
    console.error("Error initializing app:", err);
    alert("Error initializing app. Check console for details.");
  }
}
init();

// Convert <select class="large-select"> into accessible custom dropdowns
(function () {
  const selects = Array.from(document.querySelectorAll("select.large-select"));
  selects.forEach((sel) => {
    if (sel.dataset.cs === "1") return;
    sel.dataset.cs = "1";

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "cs-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const list = document.createElement("div");
    list.className = "cs-list";
    list.setAttribute("role", "listbox");
    list.tabIndex = -1;
    list.style.display = "none";

    Array.from(sel.options).forEach((opt) => {
      const item = document.createElement("div");
      item.className = "cs-item";
      item.setAttribute("role", "option");
      item.dataset.value = opt.value;
      item.textContent = opt.textContent || opt.value;
      if (opt.disabled) item.setAttribute("aria-disabled", "true");
      if (opt.selected) {
        trigger.textContent = item.textContent;
        item.setAttribute("aria-selected", "true");
      } else {
        item.setAttribute("aria-selected", "false");
      }
      item.addEventListener("click", function () {
        sel.value = this.dataset.value;
        list
          .querySelectorAll(".cs-item")
          .forEach((i) => i.setAttribute("aria-selected", "false"));
        this.setAttribute("aria-selected", "true");
        trigger.textContent = this.textContent;
        list.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      });
      list.appendChild(item);
    });

    if (!trigger.textContent) {
      const first = sel.selectedOptions[0] || sel.options[0];
      trigger.textContent = first ? first.textContent : "Select";
    }

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      const open = list.style.display !== "none";
      if (open) {
        list.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
      } else {
        list.style.display = "block";
        trigger.setAttribute("aria-expanded", "true");
        const selItem =
          list.querySelector("[aria-selected='true']") || list.firstChild;
        if (selItem) selItem.scrollIntoView({ block: "nearest" });
      }
    });

    trigger.addEventListener("keydown", function (e) {
      if (
        e.key === "ArrowDown" ||
        e.key === " " ||
        e.key === "Enter"
      ) {
        e.preventDefault();
        list.style.display = "block";
        trigger.setAttribute("aria-expanded", "true");
        const selItem =
          list.querySelector("[aria-selected='true']") || list.firstChild;
        if (selItem) selItem.focus();
      }
    });

    list.addEventListener("keydown", function (e) {
      const items = Array.from(list.querySelectorAll(".cs-item"));
      let idx = items.findIndex((i) => i === document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        idx = Math.min(items.length - 1, idx + 1);
        items[idx].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idx = Math.max(0, idx - 1);
        items[idx].focus();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        document.activeElement.click();
      } else if (e.key === "Escape") {
        list.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    });

    document.addEventListener("click", function (ev) {
      if (!wrapper.contains(ev.target)) {
        list.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    sel.classList.add("cs-hidden-select");

    wrapper.appendChild(trigger);
    wrapper.appendChild(list);
    sel.parentNode.insertBefore(wrapper, sel.nextSibling);
  });
})();
