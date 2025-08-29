const input = document.getElementById("find");
const findBtn = document.querySelector(".label label");
const locationIcon = document.querySelector(".input .location");
const magnifier = document.querySelector(".magnifier");
const mapContainer = document.querySelector(".map");
const mapWrapper = document.querySelector(".map-container");

let map;

const spinner = document.getElementById("spinner");

function showSpinner() {
  spinner.style.display = "flex";
}

function hideSpinner() {
  spinner.style.display = "none";
}


// Show custom notification
function showNotification(message) {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.classList.add("show");

  setTimeout(() => {
    notif.classList.remove("show");
  }, 3000);
}

// Create map with given coordinates
function createMap(lat = 6.5244, lon = 3.3792) {
  // Reveal map
  mapWrapper.classList.add("visible");

  // Remove existing map
  if (map) {
    map.remove();
  }

  // Init new map
  map = L.map(mapContainer).setView([lat, lon], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  L.marker([lat, lon]).addTo(map).bindPopup("You are here").openPopup();

  fetchNearbyRestaurants(lat, lon);
}

// Get current location via Geolocation API
function getCurrentLocation() {
  showSpinner();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        createMap(position.coords.latitude, position.coords.longitude);
        hideSpinner();
      },
      () => {
        hideSpinner();
        showNotification("Could not get your location.");
      }
    );
  } else {
    hideSpinner();
    showNotification("Geolocation not supported.");
  }
}

// Search by location name using Nominatim
function searchLocation(query) {
  showSpinner();
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.length > 0) {
        const { lat, lon } = data[0];
        createMap(parseFloat(lat), parseFloat(lon));
      } else {
        showNotification("Location not found.");
      }
      hideSpinner();
    })
    .catch(() => {
      hideSpinner();
      showNotification("Error getting location.");
    });
}

function fetchNearbyRestaurants(lat, lon) {
  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](around:1000,${lat},${lon});
      way["amenity"="restaurant"](around:1000,${lat},${lon});
      relation["amenity"="restaurant"](around:1000,${lat},${lon});
    );
    out center;
  `;

  showSpinner();

  fetch(overpassUrl, {
    method: "POST",
    body: query,
  })
    .then((res) => res.json())
    .then((data) => {
      hideSpinner();

      const restaurantList = document.getElementById("restaurantList").querySelector("ul");
      restaurantList.innerHTML = ""; // Clear previous

      if (!data.elements.length) {
        showNotification("No restaurants found nearby.");
        return;
      }

      data.elements.forEach((element) => {
        let lat, lon;

        if (element.type === "node") {
          lat = element.lat;
          lon = element.lon;
        } else if (element.center) {
          lat = element.center.lat;
          lon = element.center.lon;
        }

        if (lat && lon) {
          const name = element.tags.name || "Unnamed Restaurant";

          // Add marker
          const marker = L.marker([lat, lon])
            .addTo(map)
            .bindPopup(`<strong>${name}</strong>`);

          // Add to restaurant list
          const li = document.createElement("li");
          li.textContent = name;
          li.addEventListener("click", () => {
            map.setView([lat, lon], 18);
            marker.openPopup();
          });

          restaurantList.appendChild(li);
        }
      });
    })
    .catch(() => {
      hideSpinner();
      showNotification("Failed to load restaurants.");
    });
}


// Event Listeners
findBtn.addEventListener("click", getCurrentLocation);
locationIcon.addEventListener("click", getCurrentLocation);

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && input.value.trim()) {
    searchLocation(input.value.trim());
  }
});

magnifier.addEventListener("click", () => {
  if (input.value.trim()) {
    searchLocation(input.value.trim());
  }
});

// Optional: Load a default location (e.g., Lagos)
window.onload = () => {
  // Do not show map initially
};
