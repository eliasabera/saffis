// API Keys
const apiKey = "5b3ce3597851110001cf624833ffde1333f94247944a6163af96847d"; // OpenRouteService
const openCageApiKey = "33fa32fb9e934f129cb4713373c6a54b"; // OpenCage

// Initialize Leaflet map
const map = L.map("map").setView([9.03, 38.74], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let routeLayer;
let markers = [];

// Add location input field
function addLocationInput() {
  const div = document.createElement("div");
  div.className = "location-input mb-2";
  div.innerHTML = `
        <div class="input-group">
            <span class="input-group-text"><i class="fas fa-map-marker-alt"></i></span>
            <input type="text" class="form-control place-input" placeholder="Delivery stop">
            <button class="btn btn-outline-danger" onclick="this.parentNode.parentNode.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
  document.getElementById("locations").appendChild(div);
}

// Geocode place name to coordinates
async function geocodeWithOpenCage(place) {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    place
  )}&key=${openCageApiKey}&limit=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch geocoding data");

  const data = await response.json();
  if (!data.results.length) throw new Error("No results found for: " + place);

  const { lat, lng } = data.results[0].geometry;
  return [lng, lat];
}

// Find optimized route
async function findRoute() {
  const inputs = document.querySelectorAll(".place-input");
  const places = Array.from(inputs)
    .map((input) => input.value.trim())
    .filter((val) => val);
  const infoBox = document.getElementById("routeInfo");

  if (places.length < 2) {
    infoBox.innerHTML =
      '<div class="alert alert-warning">Please enter at least two locations.</div>';
    return;
  }

  try {
    infoBox.innerHTML =
      '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Calculating optimized route...</div>';

    const coords = [];
    for (const place of places) {
      try {
        const coord = await geocodeWithOpenCage(place);
        coords.push(coord);
      } catch (err) {
        infoBox.innerHTML = `<div class="alert alert-danger">Geocoding failed for "${place}": ${err.message}</div>`;
        return;
      }
    }

    const startCoord = coords[0];
    const jobCoords = coords.slice(1);

    const jobs = jobCoords.map(([lng, lat], idx) => ({
      id: idx + 1,
      location: [lng, lat],
      service: 300,
    }));

    const vehicle = {
      id: 1,
      start: startCoord,
      end: startCoord,
      profile: "driving-car",
      capacity: [1],
    };

    const optimizationPayload = {
      jobs,
      vehicles: [vehicle],
    };

    const response = await fetch(
      "https://api.openrouteservice.org/optimization",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(optimizationPayload),
      }
    );

    if (!response.ok) throw new Error("Optimization API failed");
    const optimized = await response.json();

    const route = optimized.routes[0];
    const orderedJobIds = route.steps
      .filter((step) => step.hasOwnProperty("job"))
      .map((step) => step.job);

    const optimizedCoords = [startCoord];
    orderedJobIds.forEach((jobId) => {
      const job = jobs.find((j) => j.id === jobId);
      if (job) optimizedCoords.push(job.location);
    });

    const directionsResponse = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coordinates: optimizedCoords }),
      }
    );

    if (!directionsResponse.ok) throw new Error("Route drawing failed");
    const geojson = await directionsResponse.json();

    if (routeLayer) map.removeLayer(routeLayer);
    markers.forEach((marker) => map.removeLayer(marker));
    markers = [];

    routeLayer = L.geoJSON(geojson, {
      style: { color: "#0d6efd", weight: 4 },
    }).addTo(map);
    map.fitBounds(routeLayer.getBounds());

    optimizedCoords.forEach(([lng, lat], index) => {
      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(
          `<b>Stop ${index + 1}</b><br>${places[index] || "Unknown location"}`
        );
      markers.push(marker);
      if (index === 0) marker.openPopup();
    });

    const segment = geojson.features?.[0]?.properties?.segments?.[0];
    if (!segment) throw new Error("Invalid route geometry received.");

    const minutes = Math.round(segment.duration / 60);
    const distanceKm = (segment.distance / 1000).toFixed(2);
    const eta = new Date(
      Date.now() + segment.duration * 1000
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    infoBox.innerHTML = `
            <div class="alert alert-success">
                <div class="d-flex justify-content-between">
                    <span><i class="fas fa-road"></i> <strong>Distance:</strong> ${distanceKm} km</span>
                    <span><i class="fas fa-clock"></i> <strong>Time:</strong> ${minutes} min</span>
                    <span><i class="fas fa-hourglass-end"></i> <strong>ETA:</strong> ${eta}</span>
                </div>
            </div>
            <button class="btn btn-sm btn-success w-100 mt-2" id="assignRouteBtn">
                <i class="fas fa-paper-plane"></i> Assign to Rider
            </button>
        `;

    // Save route data for assignment
    const routeData = {
      info: { distanceKm, minutes, eta },
      optimizedCoords,
      places,
    };
    sessionStorage.setItem("optimizedRouteData", JSON.stringify(routeData));
  } catch (error) {
    console.error(error);
    infoBox.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</div>`;
  }
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  // Initialize delivery chart
  const ctx = document.getElementById("deliveryChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Completed Deliveries",
          data: [12, 19, 15, 24, 22, 18, 25],
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13, 110, 253, 0.1)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  // Event listeners
  document
    .getElementById("generateBtn")
    .addEventListener("click", function (e) {
      e.preventDefault();
      findRoute();
    });

  document.getElementById("chatbotBtn").addEventListener("click", function () {
    const modal = new bootstrap.Modal(document.getElementById("chatbotModal"));
    modal.show();
  });
});

// Make functions available globally
window.addLocationInput = addLocationInput;
window.findRoute = findRoute;
