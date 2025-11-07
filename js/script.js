// ✅ Your OpenWeather API Key
const API_KEY = "12b0804eac977bc7c10b2d4938dc2d94";

// DOM
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const loader = document.getElementById("loader");
const toast = document.getElementById("toast");

// Current weather fields
const cityName = document.getElementById("cityName");
const description = document.getElementById("description");
const temperature = document.getElementById("temperature");
const feelsLike = document.getElementById("feelsLike");
const weatherIcon = document.getElementById("weatherIcon");
const dateTime = document.getElementById("dateTime");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");

const forecastGrid = document.getElementById("forecast");

const OW_ICON = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;

// 🔁 Utilities
const showLoader = (s=true)=> loader.classList.toggle("hidden", !s);
const showToast = (msg, ms=2200)=>{
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(()=> toast.classList.add("hidden"), ms);
};
const fmtTime = (unix, tzOffset) => {
  try {
    const ms = (unix + tzOffset) * 1000; // unix + shift (in seconds)
    const d = new Date(ms);
    return d.toUTCString().split(" ")[4].slice(0,5);
  } catch { return "—" }
};

// 🖼️ Dynamic weather-based backgrounds (Unsplash source - no key needed)
function setDynamicBackground(icon, main) {
  const isDay = icon?.endsWith("d");
  let query = "weather sky";
  const m = (main || "").toLowerCase();

  if (m.includes("clear")) query = isDay ? "clear blue sky" : "clear night sky stars";
  else if (m.includes("cloud")) query = isDay ? "cloudy sky daylight" : "cloudy night sky";
  else if (m.includes("rain")) query = "rain storm city";
  else if (m.includes("drizzle")) query = "light rain";
  else if (m.includes("thunder")) query = "thunderstorm lightning clouds";
  else if (m.includes("snow")) query = "snow winter landscape";
  else if (m.includes("mist") || m.includes("fog") || m.includes("haze")) query = "fog mist city";
  else query = "sky landscape";

  const url = `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`;
  document.body.style.backgroundImage = `url('${url}')`;
}

// 🔎 Fetch current + forecast
async function fetchWeatherByCity(city){
  if(!city) return showToast("Enter a city name");
  showLoader(true);
  try{
    // Current
    const curURL = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const curRes = await fetch(curURL);
    if(!curRes.ok) throw new Error("City not found");
    const cur = await curRes.json();

    // Forecast (3-hourly)
    const fcURL = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const fcRes = await fetch(fcURL);
    const fc = await fcRes.json();
    if(fc.cod !== "200") throw new Error("Forecast unavailable");

    renderCurrent(cur);
    renderForecast(fc);

    // Remember last city
    localStorage.setItem("wx_last_city", cur.name);
  } catch(err){
    showToast(err.message || "Failed to fetch weather");
  } finally{
    showLoader(false);
  }
}

function renderCurrent(data){
  const { name, sys, weather, main, wind: w, timezone } = data;
  const cond = weather?.[0] || {};
  const icon = cond.icon || "01d";

  cityName.textContent = `${name}, ${sys?.country || ""}`;
  description.textContent = cond.description ? cond.description[0].toUpperCase()+cond.description.slice(1) : "—";
  temperature.textContent = `${Math.round(main?.temp ?? 0)}°C`;
  feelsLike.textContent = `Feels like ${Math.round(main?.feels_like ?? 0)}°C`;
  weatherIcon.src = OW_ICON(icon);
  weatherIcon.alt = cond.main || "Weather";
  weatherIcon.onerror = () => { weatherIcon.src = OW_ICON("01d"); };

  // Local time using timezone shift (seconds)
  const nowUTC = Math.floor(Date.now()/1000);
  dateTime.textContent = new Date((nowUTC + timezone) * 1000).toUTCString().replace("GMT","").slice(0,22);

  humidity.textContent = `${main?.humidity ?? "—"}%`;
  wind.textContent = `${(w?.speed*3.6).toFixed(0)} km/h`; // m/s -> km/h
  pressure.textContent = `${main?.pressure ?? "—"} hPa`;
  sunrise.textContent = fmtTime(sys?.sunrise, timezone);
  sunset.textContent = fmtTime(sys?.sunset, timezone);

  setDynamicBackground(icon, cond.main || "");
}

function renderForecast(fc){
  // Group by date
  const byDate = {};
  for (const item of fc.list){
    const d = item.dt_txt.split(" ")[0]; // YYYY-MM-DD
    if(!byDate[d]) byDate[d] = [];
    byDate[d].push(item);
  }

  const days = Object.keys(byDate).slice(0, 5); // next 5 dates
  forecastGrid.innerHTML = "";

  days.forEach(date => {
    // pick 12:00 if exists else middle entry
    const arr = byDate[date];
    let pick = arr.find(x => x.dt_txt.includes("12:00:00")) || arr[Math.floor(arr.length/2)];
    const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
    const pretty = new Date(date).toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
    const icon = pick.weather?.[0]?.icon || "01d";
    const desc = pick.weather?.[0]?.main || "";
    const t = Math.round(pick.main?.temp ?? 0);

    // 🔽 inner details (3-hourly slots)
    const detailsHTML = arr.map(d => {
      const time = d.dt_txt.split(" ")[1].slice(0,5);
      const ti = Math.round(d.main?.temp ?? 0);
      const de = d.weather?.[0]?.description ?? "";
      const hu = d.main?.humidity ?? "—";
      const wi = (d.wind?.speed*3.6).toFixed(0);
      return `<p><b>${time}</b> → 🌡 ${ti}°C, ${de}, 💧${hu}%, 🍃${wi} km/h</p>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "fcard";
    card.innerHTML = `
      <div class="day">${dayName}</div>
      <div class="date">${pretty}</div>
      <img src="${OW_ICON(icon)}" alt="${desc}" onerror="this.src='https://openweathermap.org/img/wn/01d@2x.png'">
      <div class="t">${t}°C</div>
      <div class="tdesc">${desc}</div>
      <div class="fdetails">${detailsHTML}</div>
    `;

    // 🔽 Expand/collapse
    card.addEventListener("click", () => {
      card.classList.toggle("expanded");
    });

    forecastGrid.appendChild(card);
  });
}

// 🔘 Events
searchBtn.addEventListener("click", () => fetchWeatherByCity(cityInput.value.trim()));
cityInput.addEventListener("keydown", (e)=> { if(e.key==="Enter"){ fetchWeatherByCity(cityInput.value.trim()); }});

// 📍 Geolocation (optional)
geoBtn.addEventListener("click", async()=>{
  if(!navigator.geolocation) return showToast("Geolocation not supported");
  showLoader(true);
  navigator.geolocation.getCurrentPosition(async(pos)=>{
    try{
      const { latitude, longitude } = pos.coords;
      const curURL = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
      const res = await fetch(curURL);
      const cur = await res.json();
      if(cur?.name){
        cityInput.value = cur.name;
        fetchWeatherByCity(cur.name);
      } else {
        showToast("Could not detect city");
      }
    } catch{
      showToast("Location fetch failed");
      showLoader(false);
    }
  }, ()=>{ showToast("Location denied"); showLoader(false); });
});

// 🚀 Init: load last city or Delhi
window.addEventListener("DOMContentLoaded", ()=>{
  const last = localStorage.getItem("wx_last_city") || "Delhi";
  cityInput.value = last;
  fetchWeatherByCity(last);
});
