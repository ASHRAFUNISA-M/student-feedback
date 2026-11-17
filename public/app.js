import {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  collection,
  addDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const feedbackForm = document.querySelector("#feedbackForm");
const feedbackList = document.querySelector("#feedbackList");
const statusMessage = document.querySelector("#statusMessage");

const setStatus = (text, type = "") => {
  statusMessage.textContent = text;
  statusMessage.className = "status-message";

  if (type) {
    statusMessage.classList.add(type);
  }
};

const isFirebaseConfigValid = (config) => {
  if (!config) {
    return false;
  }

  const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];

  return requiredKeys.every((key) => {
    const value = config[key];
    return typeof value === "string" && value.trim() && !value.includes("YOUR_");
  });
};

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp.seconds * 1000));
};

const renderStars = (rating) => {
  const numericRating = Number(rating) || 0;
  return Array.from({ length: 5 }, (_, index) => (index < numericRating ? "★" : "☆")).join("");
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderFeedback = (documents) => {
  if (!documents.length) {
    feedbackList.innerHTML = '<div class="empty-state">No feedback submitted yet. Be the first to share your experience.</div>';
    return;
  }

  feedbackList.innerHTML = documents
    .map((document) => {
      const { studentName, message, rating, createdAt } = document.data();
      const safeName = escapeHtml(studentName || "Anonymous Student");
      const safeMessage = escapeHtml(message || "No message provided.");

      return `
        <article class="feedback-card">
          <div class="feedback-head">
            <h3 class="student-name">${safeName}</h3>
            <span class="rating-badge">${renderStars(rating)} (${rating || 0}/5)</span>
          </div>
          <p class="feedback-message">${safeMessage}</p>
          <div class="feedback-meta">Submitted on ${formatDate(createdAt)}</div>
        </article>
      `;
    })
    .join("");
};

if (!isFirebaseConfigValid(window.firebaseConfig)) {
  console.warn("Firebase configuration is not set. Update public/firebase-config.js with your existing project settings before running the app.");
  setStatus("Update public/firebase-config.js with your Firebase project settings to enable saving feedback.", "error");
} else {
  const app = initializeApp(window.firebaseConfig);
  const db = getFirestore(app);
  const feedbackCollection = collection(db, "feedback");
  const feedbackQuery = query(feedbackCollection, orderBy("createdAt", "desc"));

  onSnapshot(
    feedbackQuery,
    (snapshot) => {
      renderFeedback(snapshot.docs);
    },
    (error) => {
      console.error("Failed to load feedback:", error);
      setStatus("Unable to load feedback right now. Please refresh the page.", "error");
    }
  );

  feedbackForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(feedbackForm);
    const studentName = String(formData.get("studentName") || "").trim();
    const message = String(formData.get("feedbackMessage") || "").trim();
    const rating = Number(formData.get("rating"));

    if (!studentName || !message || !rating || rating < 1 || rating > 5) {
      setStatus("Please complete all fields and choose a rating from 1 to 5.", "error");
      return;
    }

    setStatus("Submitting your feedback...", "");

    try {
      await addDoc(feedbackCollection, {
        studentName,
        message,
        rating,
        createdAt: serverTimestamp(),
      });

      feedbackForm.reset();
      setStatus("Thank you! Your feedback was submitted successfully.", "success");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setStatus("Something went wrong while submitting feedback. Please try again.", "error");
    }
  });
}
