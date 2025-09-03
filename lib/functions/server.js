import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";
import chalk from "chalk";
import config from "#config";

let sessionVerified = false;
let connected = false;
let webServerStarted = false;
let qrCodeToSend = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startWebServer() {
  if (webServerStarted) return { sessionVerified, connected, setQR: () => {}, close: () => {} };
  webServerStarted = true;
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server);

  app.use(express.static("public"));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });

  app.get("/session", (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Javix Session Auth</title>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/5968/5968841.png" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <script>
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            primary: {
                                50: '#f0f9ff',
                                100: '#e0f2fe',
                                200: '#bae6fd',
                                300: '#7dd3fc',
                                400: '#38bdf8',
                                500: '#0ea5e9',
                                600: '#0284c7',
                                700: '#0369a1',
                                800: '#075985',
                                900: '#0c4a6e',
                            },
                            dark: {
                                900: '#0f172a',
                                800: '#1e293b',
                                700: '#334155',
                                600: '#475569',
                                500: '#64748b',
                            }
                        },
                        fontFamily: {
                            'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
                        },
                    }
                }
            }
          </script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                background-color: #0f172a;
                color: #e2e8f0;
            }
            
            *:focus {
                outline: none !important;
                box-shadow: none !important;
            }
            
            ::-webkit-scrollbar {
                width: 8px;
            }
            ::-webkit-scrollbar-track {
                background: #1e293b;
            }
            ::-webkit-scrollbar-thumb {
                background: #475569;
                border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #64748b;
            }
            
            .loading-dots::after {
                content: '';
                animation: loading-dots 1.5s infinite;
            }
            @keyframes loading-dots {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }
          </style>
        </head>
        <body class="min-h-screen bg-dark-900">
            <!-- Navbar -->
    <!-- Navbar -->
    <nav class="fixed w-full bg-dark-800/80 backdrop-blur-md z-50 border-b border-dark-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <a href="#" class="text-2xl font-bold text-primary-400 hover:text-primary-300 transition-colors"> Javix </a>
          </div>

          <!-- Navigation Links -->
          <div class="hidden md:block">
            <div class="ml-10 flex items-center space-x-4">
              <a href="/" class="text-gray-300 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</a>
              <a href="/#about" class="text-gray-300 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">About</a>
              <a href="/#features" class="text-gray-300 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Features</a>
              <a href="#" class="text-gray-300 hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Session</a>
            </div>
          </div>

          <div class="md:hidden flex items-center">
            <button id="mobile-menu-button" class="text-gray-300 hover:text-primary-400 focus:outline-none">
              <i class="fas fa-bars text-xl"></i>
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="hidden md:flex flex items-center space-x-4">
            <a href="https://github.com/usmanali564" target="_blank" class="text-gray-300 hover:text-primary-400 transition-colors">
              <i class="fab fa-github text-xl"></i>
            </a>
            <a href="https://github.com/usmanali564/javix" class="text-gray-300 hover:text-primary-400 transition-colors">
              <i class="fas fa-code text-xl"></i>
            </a>
            <a href="https://wa.me/966574824041" target="_blank" class="text-gray-300 hover:text-primary-400 transition-colors">
              <i class="fab fa-whatsapp text-xl"></i>
            </a>
            <a href="https://github.com/usmanali564/javix" class="hidden md:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"> Get Started </a>
          </div>
        </div>
      </div>
    </nav>

    <!-- SideBar -->
    <div id="mobile-menu" class="fixed inset-y-0 right-0 w-64 bg-dark-800 shadow-lg transform translate-x-full z-50 transition-transform duration-300 ease-in-out md:hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-dark-700">
        <span class="text-xl font-bold text-primary-400">Javix</span>
        <button id="close-menu-button" class="text-gray-300 hover:text-primary-400 focus:outline-none">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="px-6 py-4 space-y-6">
        <a href="/" class="block text-gray-300 hover:text-primary-400 transition-colors">Home</a>
        <a href="/#about" class="block text-gray-300 hover:text-primary-400 transition-colors">About</a>
        <a href="/#features" class="block text-gray-300 hover:text-primary-400 transition-colors">Features</a>
        <div class="pt-4 border-t border-dark-700 space-y-4">
          <a href="https://github.com/usmanali564/javix" target="_blank" class="flex items-center text-gray-300 hover:text-primary-400 transition-colors"> <i class="fab fa-github mr-3"></i> GitHub </a>
          <a href="#" class="flex items-center text-gray-300 hover:text-primary-400 transition-colors"> <i class="fas fa-code mr-3"></i> Session </a>
          <a href="https://wa.me/966574824041" target="_blank" class="flex items-center text-gray-300 hover:text-primary-400 transition-colors"> <i class="fab fa-whatsapp mr-3"></i> WhatsApp </a>
        </div>
        <a href="https://github.com/usmanali564/javix" class="block mt-6 px-4 py-2 text-center text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"> Get Started </a>
      </div>
    </div>

            <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div class="bg-dark-800 rounded-xl p-8 border border-dark-700 max-w-md mx-auto">
                    <div class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-primary-400 mb-2">Session Authentication</h1>
                        <p class="text-gray-400">Connect your WhatsApp account to Javix</p>
                    </div>
                    
                    <div id="auth-container">
                        ${
                          !sessionVerified
                            ? `
                            <form id="sessionForm" class="space-y-4">
                                <div>
                                    <input type="text" id="sessionId" name="sessionId" 
                                        class="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:border-primary-500 transition-colors"
                                        placeholder="Enter Session ID" required autocomplete="off">
                                </div>
                                <button type="submit" 
                                    class="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
                                    Verify Session
                                </button>
                            </form>
                            <div id="msg" class="mt-4 text-center"></div>
                            <div id="qr"></div>
                        `
                            : !connected
                            ? `
                            <div class="text-center text-yellow-400">
                                <i class="fas fa-clock text-4xl mb-4"></i>
                                <p class="text-xl font-medium">Session verified</p>
                                <p class="text-gray-400 mt-2">Waiting for WhatsApp connection...</p>
                                <div id="qr"></div>
                            </div>
                        `
                            : `
                            <div class="text-center text-green-400">
                                <i class="fas fa-check-circle text-4xl mb-4"></i>
                                <p class="text-xl font-medium">Session active</p>
                                <p class="text-gray-400 mt-2">Your WhatsApp session is connected</p>
                            </div>
                        `
                        }
                    </div>
                </div>
            </section>

                      
      <!-- Footer -->
    <footer class="bg-dark-800 py-12 px-4 sm:px-6 lg:px-8 border-t border-dark-700">
      <div class="max-w-7xl mx-auto">
        <div class="text-center">
         
          <div class="flex justify-center space-x-6 mb-8">
            <a href="https://github.com/maherxubair" target="_blank" class="text-gray-400 hover:text-primary-400 transition-colors">
              <i class="fab fa-github text-xl"></i>
            </a>
            <a href="https://api.nexoracle.com" class="text-gray-400 hover:text-primary-400 transition-colors">
              <i class="fas fa-code text-xl"></i>
            </a>
            <a href="https://wa.me/923466319114" target="_blank" class="text-gray-400 hover:text-primary-400 transition-colors">
              <i class="fab fa-whatsapp text-xl"></i>
            </a>
          </div>
          <p class="text-white-500 text-sm">Designed and Developed by <a href="https://nexoracle.com" target="_blank" class="text-primary-400 hover:text-primary-300 transition-colors">NexOracle</a></p>
        </div>
      </div>
    </footer>

            <script src="/socket.io/socket.io.js"></script>
            <script>
           // Mobile menu toggle
      const mobileMenuButton = document.getElementById("mobile-menu-button");
      const closeMenuButton = document.getElementById("close-menu-button");
      const mobileMenu = document.getElementById("mobile-menu");

      mobileMenuButton.addEventListener("click", () => {
        mobileMenu.classList.remove("translate-x-full");
        mobileMenu.classList.add("translate-x-0");
      });

      closeMenuButton.addEventListener("click", () => {
        mobileMenu.classList.remove("translate-x-0");
        mobileMenu.classList.add("translate-x-full");
      });

      // Close menu when clicking on a link
      document.querySelectorAll("#mobile-menu a").forEach((link) => {
        link.addEventListener("click", () => {
          mobileMenu.classList.remove("translate-x-0");
          mobileMenu.classList.add("translate-x-full");
        });
      });
                
                document.getElementById('close-menu-button').addEventListener('click', () => {
                    document.getElementById('mobile-menu').classList.remove('translate-x-0');
                    document.getElementById('mobile-menu').classList.add('translate-x-full');
                });



                if (document.getElementById('sessionForm')) {
                    document.getElementById('sessionForm').onsubmit = async function(e) {
                        e.preventDefault();
                        const msgEl = document.getElementById('msg');
                        msgEl.className = 'text-yellow-400 loading-dots';
                        msgEl.innerText = 'Verifying';
                        
                        const sessionId = document.getElementById('sessionId').value;
                        try {
                            const res = await fetch('/verify-session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sessionId })
                            });
                            const data = await res.json();
                            
                            if (data.success) {
                                msgEl.className = 'text-green-400';
                                msgEl.innerText = 'Session ID verified! Waiting for QR...';
                                setTimeout(() => location.reload(), 1000);
                            } else {
                                msgEl.className = 'text-red-400';
                                msgEl.innerText = 'Invalid session ID. Please try again.';
                            }
                        } catch (error) {
                            msgEl.className = 'text-red-400';
                            msgEl.innerText = 'Connection error. Please try again.';
                        }
                    }
                }

                const socket = io();
                socket.on('qr', qr => {
                    const qrEl = document.getElementById('qr');
                    if (qrEl && !qrEl.innerHTML) {
                        qrEl.innerHTML = \`
                            <div class="mt-6 text-center">
                                <p class="text-gray-300 mb-4">Scan this QR code in WhatsApp:</p>
                                <img src="https://api.qrserver.com/v1/create-qr-code/?data=\${encodeURIComponent(qr)}&size=280x280" 
                                     class="rounded-lg border border-dark-600 shadow-lg hover:shadow-xl transition-shadow mx-auto"
                                     alt="WhatsApp QR Code">
                            </div>
                        \`;
                    }
                });
            </script>
        </body>
      </html>
    `);
  });

  app.post("/verify-session", (req, res) => {
    const { sessionId } = req.body;
    if (sessionId === config.sessionId) {
      sessionVerified = true;
      res.json({ success: true, message: "Session ID verified! Reloading..." });
    } else {
      res.json({ success: false, message: "Invalid session ID." });
    }
  });

  const PORT = config.PORT;
  server.listen(PORT, () => {
    console.log(chalk.green(`Express server running at http://localhost:${PORT}`));
  });

  return {
    setQR: (qr) => {
      qrCodeToSend = qr;
      io.emit("qr", qr);
    },
    close: () => {
      console.log(chalk.yellow("Web server closed after successful login."));
    },
    get sessionVerified() {
      return sessionVerified;
    },
    set sessionVerified(val) {
      sessionVerified = val;
    },
    get connected() {
      return connected;
    },
    set connected(val) {
      connected = val;
    },
  };
}
