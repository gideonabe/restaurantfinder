const input = document.getElementById("find");
const findBtn = document.querySelector(".label label");
const locationIcon = document.querySelector(".input .location");
const magnifier = document.querySelector(".magnifier");
const mapContainer = document.getElementById("mapContainer");
const spinner = document.getElementById("spinner");
const notification = document.getElementById("notification");
// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

let map;

// Spinner helpers
function showSpinner() {
  spinner.style.display = "flex";
}
function hideSpinner() {
  spinner.style.display = "none";
}

// Notification
function showNotification(message) {
  notification.textContent = message;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}

// Create the map
function createMap(lat = 6.5244, lon = 3.3792) {
  mapContainer.style.display = "block";

  if (map) map.remove();

  map = L.map(document.querySelector(".map")).setView([lat, lon], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  L.marker([lat, lon]).addTo(map).bindPopup("You are here").openPopup();

  fetchNearbyRestaurants(lat, lon);
}

// Geolocation
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

// Search input
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

// Restaurant fetch
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
      restaurantList.innerHTML = "";

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

          const marker = L.marker([lat, lon])
            .addTo(map)
            .bindPopup(`<strong>${name}</strong>`);

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

// Events
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

// Optional default map
// window.onload = () => createMap(6.5244, 3.3792);
