// File: config/firebase.js
const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyB_fr25J_JtzNf27Qz3ETuyJvEI_VIQ47E",
  authDomain: "beardiary-59edf.firebaseapp.com",
  projectId: "beardiary-59edf",
  storageBucket: "beardiary-59edf.firebasestorage.app",
  messagingSenderId: "448292396888",
  appId: "1:448292396888:web:b776310abd93114b0e0f2d",
  measurementId: "G-6BR3B8E86P"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
// Lấy công cụ Xác thực (Authentication) ra để dùng
const auth = getAuth(app);

module.exports = { auth };