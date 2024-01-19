'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const globalBtns = document.querySelector('.btns');
const errorMessage = document.querySelector('.error--container');

class Workout {
  date = new Date();
  id = (new Date().getTime() + '').slice(-10);
  constructor(distance, coords, duration) {
    this.distance = distance; //km
    this.coords = coords;
    this.duration = duration; //min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 
'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, coords, duration, cadence) {
    super(distance, coords, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, coords, duration, elevationGain) {
    super(distance, coords, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = +this.distance / +(this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running(10, [35, 64], 25, 160);
// const cycl1 = new Cycling(40, [24, 84], 180, 2000);
// console.log(run1, cycl1);

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #sortedWorkouts = [];
  #markers = [];
  constructor() {
    //API geolocation // get Position
    this._getPosition();

    //get locale storage
    this._getLocalStorage();
    // this._showMapLayers();

    //add event handlers
    form.addEventListener('submit', this._newWorkout.bind(this)); //add bind(this) to use class vars
    inputType.addEventListener('change', this._toogleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deletWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    globalBtns.addEventListener('click', this._deleteAllWorkouts.bind(this));
    globalBtns.addEventListener('click', this._sortWorkouts.bind(this));
    globalBtns.addEventListener('click', this._showAllWorkouts.bind(this));
    document
      .querySelector('.logo')
      .addEventListener('click', this._showMapLayers.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // to get a function
        function () {
          alert('Nie możemy określić twojej pozycji!');
        }
      );
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 15);

    L.tileLayer('https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    L.marker(coords).addTo(this.#map).bindPopup('Current position').openPopup();
    this.#map.on('click', this._showForm.bind(this));
    //render positions
    this.#workouts.forEach(w => {
      this._renderWorkoutMarker(w);
    });
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // prettier-ignore
    inputDistance.value =
    inputDuration.value =
    inputCadence.value =
    inputElevation.value =
    ' ';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toogleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const isValid = (...values) => values.every(val => Number.isFinite(val));
    const allPositive = (...values) => values.every(val => val > 0);

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // get Data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // check if data is valid
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !isValid(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this._showAlert(type);
      //if workout is running create running obj.
      workout = new Running(distance, [lat, lng], duration, cadence);
    }

    //if workout is cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !isValid(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return this._showAlert();
      workout = new Cycling(distance, [lat, lng], duration, elevation);
    }
    //add workout to workouts array
    this.#workouts.push(workout);

    //render workout on map
    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkout(workout);

    //clear all fields and hide form
    this._hideForm();

    //set the localStorage
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    this.#markers.push([workout.id, marker]);
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
 
  `;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  
      `;
    }
    html += `<div class="btn--func">
    <button class="btn--show-view" title="Show on the map">👀</button>
    <button class="btn--delete-workout" title="Delete workout">❌</button>
    <button class="btn--edit-workout" title="Edit workout">⚙</button>
    
    </div>
    </li> `;
    form.insertAdjacentHTML('afterend', html);
    this._showBtns();
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.btn--show-view');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      w => w.id === workoutEl.closest('.workout').dataset.id
    );

    this.#map.setView(workout.coords, 15, {
      animate: true,
      pan: { duration: 1 },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // good only for small amounts of data
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    data.forEach(el => {
      if (el.type === 'running') {
        const workout = new Running(
          el.distance,
          el.coords,
          el.duration,
          el.cadence
        );
        workout.date = el.date;
        workout.id = el.id;
      }
      if (el.type === 'cycling') {
        const workout = new Running(
          el.distance,
          el.coords,
          el.duration,
          el.elevationGain
        );
        workout.date = el.date;
        workout.id = el.id;
      }
    });

    this.#workouts = data;
    this.#workouts.forEach(w => {
      this._renderWorkout(w);
      // this._renderWorkoutMarker(w);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload(); // to reload the page from console
  }
  async _deletWorkout(e) {
    const workoutEl = e.target.closest('.btn--delete-workout');
    if (!workoutEl) return;
    const confirmed = await this._showError(
      'Czy na pewno chcesz usunąć trening?'
    );

    // Check if the user confirmed
    if (!confirmed) {
      console.log('Anulowano usunięcie treningu');
      return;
    }

    const workout = this.#workouts.find(
      w => w.id === workoutEl.closest('.workout').dataset.id
    );
    this._removeMarker(workout);
    this.#workouts = this.#workouts.filter(
      w => w.id !== workoutEl.closest('.workout').dataset.id
    );
    this._setLocalStorage();
    workoutEl.closest('.workout').remove();
  }
  _editWorkout(e) {
    const workoutEl = e.target.closest('.btn--edit-workout');
    if (!workoutEl) return;
    const workoutHtml = workoutEl.closest('.workout');
    console.log(workoutHtml);

    const workout = this.#workouts.find(w => w.id === workoutHtml.dataset.id);
    console.log(workout);
    let html = `<form class="form edit-form">
    <div class="form__row">
      <label class="form__label">Type</label>
      <select class="form__input form__input--type">
        <option value="running" ${
          workout.type === 'running' ? 'selected' : ''
        }>Running</option>
        <option value="cycling"  ${
          workout.type === 'cycling' ? 'selected' : ''
        }>Cycling</option>
      </select>
    </div>
    <div class="form__row">
      <label class="form__label">Distance</label>
      <input class="form__input form__input--distance" placeholder="km" value="${
        workout.distance
      }"/>
    </div>
    <div class="form__row">
      <label class="form__label">Duration</label>
      <input
        class="form__input form__input--duration "
        placeholder="min" value="${workout.duration}"
      />
    </div>
    `;
    html += `
    <div class="form__row ${
      workout.type === 'running' ? '' : 'form__row--hidden'
    }">
      <label class="form__label">Cadence</label>
      <input
        class="form__input form__input--cadence"
        placeholder="step/min" value="${
          workout.type === 'running' ? workout.cadence : workout.elevationGain
        }"
      />
    </div>
    <div class="form__row ${
      workout.type === 'cycling' ? '' : 'form__row--hidden'
    }">
      <label class="form__label">Elev Gain</label>
      <input
        class="form__input form__input--elevation"
        placeholder="meters" value="${
          workout.type === 'running' ? workout.cadence : workout.elevationGain
        }"
      />
    </div>
    <button class="form__btn">OK</button>
    </form>
    `;
    workoutHtml.outerHTML = html;
    const editFormEl = document.querySelector('.edit-form');
    const selectEditType = editFormEl.querySelector('.form__input--type');
    console.log(selectEditType);

    selectEditType.addEventListener('change', () => {
      editFormEl
        .querySelector('.form__input--cadence')
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
      editFormEl
        .querySelector('.form__input--elevation')
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
    });
    editFormEl.addEventListener('submit', e => {
      e.preventDefault();
      const isValid = (...values) => values.every(val => Number.isFinite(val));
      const allPositive = (...values) => values.every(val => val > 0);
      console.log(workout);
      const typeEdited = editFormEl.querySelector('.form__input--type').value;
      const distanceEdited = +editFormEl.querySelector('.form__input--distance')
        .value;
      const durationEdited = +editFormEl.querySelector('.form__input--duration')
        .value;
      const cadenceEdited = +editFormEl.querySelector('.form__input--cadence')
        .value;
      const elevationEdited = +editFormEl.querySelector(
        '.form__input--elevation'
      ).value;

      if (typeEdited === 'running') {
        if (
          !isValid(distanceEdited, durationEdited, cadenceEdited) ||
          !allPositive(distanceEdited, durationEdited, cadenceEdited)
        )
          return alert('Enter the positive number!');
        //if workout is running change running obj.
        const editWorkout = new Running(
          distanceEdited,
          workout.coords,
          durationEdited,
          cadenceEdited
        );

        editWorkout.date = workout.date;
        editWorkout.id = workout.id;
        const workoudIndex = this.#workouts.indexOf(workout);
        this.#workouts[workoudIndex] = editWorkout;
      }

      // if workout is cycling create cycling object
      if (typeEdited === 'cycling') {
        if (
          !isValid(distanceEdited, durationEdited, elevationEdited) ||
          !allPositive(distanceEdited, durationEdited)
        )
          return alert('Enter the positive number!');
        const editWorkout = new Cycling(
          distanceEdited,
          workout.coords,
          durationEdited,
          elevationEdited
        );
        editWorkout.date = workout.date;
        editWorkout.id = workout.id;
        const workoudIndex = this.#workouts.indexOf(workout);
        this.#workouts[workoudIndex] = editWorkout;
      }
      workoutHtml.remove();
      this._setLocalStorage();
      this._getLocalStorage();
      location.reload();
    });
  }
  _showBtns() {
    if (this.#workouts.length >= 2) globalBtns.classList.remove('hidden');
    if (this.#workouts.length < 2) globalBtns.classList.add('hidden');
  }

  async _deleteAllWorkouts(e) {
    e.preventDefault();
    //usuwanie listy
    const deletAll = e.target.closest('.delete-all');
    let allWorkouts = containerWorkouts.querySelectorAll('.workout');
    if (!deletAll || !allWorkouts.length) return;

    const confirmed = await this._showError(
      'Czy na pewno chcesz usunąć wszystkie treningi?'
    );

    // Check if the user confirmed
    if (!confirmed) return;
    const deleteListEl = function () {
      if (allWorkouts.length === 1) clearInterval(removeWorkout);
      const el = containerWorkouts.querySelector('.workout');
      const workout = this.#workouts.find(w => w.id === el.dataset.id);

      el.remove();
      this._removeMarker(workout);
      this.#workouts = this.#workouts.filter(w => w !== workout);
      this._setLocalStorage();
      this._showBtns();
      allWorkouts = containerWorkouts.querySelectorAll('.workout');
    };
    const removeWorkout = setInterval(deleteListEl.bind(this), 200);
    //SIMPLE VERSION
    // const deleteListEl = function () {
    //   if (allWorkouts.length === 1) clearInterval(removeWorkout);
    //   containerWorkouts.querySelector('.workout').remove();
    //   allWorkouts = containerWorkouts.querySelectorAll('.workout');
    // };
    // const removeWorkout = setInterval(deleteListEl, 200);
    // //wyczyszczenie pamięci
    // //   setTimeout(() => {
    // //     this.#workouts = [];
    // //     this._setLocalStorage();
    // //     location.reload();
    // //   }, allWorkouts.length * 200);
  }
  _removeMarker(w) {
    console.log(this.#markers);

    // this.#markers.forEach(
    //   el =>
    //     function () {
    //       if (el[0] === w.id) {
    //         console.log(el[1]);
    //         el[1].;
    //       }
    //     }
    // );
    // Pobranie wszystkich markerów z mapy
    let allMarkers = this.#map._layers;
    console.log(allMarkers);
    // Przeszukiwanie wszystkich warstw (markerów) w poszukiwaniu tego, który ma odpowiednie współrzędne
    for (let markerId in allMarkers) {
      if (allMarkers.hasOwnProperty(markerId)) {
        let currentMarker = allMarkers[markerId];
        if (
          currentMarker instanceof L.Marker &&
          currentMarker.getLatLng().equals(L.latLng(w.coords))
        ) {
          // Znaleziono marker o podanych współrzędnych, usuwanie go
          this.#map.removeLayer(currentMarker);
          break; // Przerywamy pętlę po znalezieniu markera
        }
      }
    }
  }
  _sortWorkouts(e) {
    e.preventDefault();
    // console.log(this.#workouts);
    if (!e.target.closest('.sort-workouts')) return;
    //version with no way back of sorted
    /* if (cotainerWorkouts.classList.contains('sorted')) {
      this.#workouts.reverse();
    } else {
      this.#workouts.sort((a, b) => (a.distance > b.distance ? -1 : 1));
      console.log(this.#workouts);
      containerWorkouts.classList.add('sorted');
    }
    this._setLocalStorage();
    containerWorkouts.querySelectorAll('.workout').forEach(el => el.remove());
    this._getLocalStorage();*/
    if (containerWorkouts.classList.contains('sorted')) {
      if (containerWorkouts.classList.contains('small-big')) {
        this._cleareContainer();
        this._getLocalStorage();
        this.#sortedWorkouts = [];
        containerWorkouts.classList.remove('sorted', 'small-big');
      } else {
        this._cleareContainer();
        this.#sortedWorkouts
          .reverse()
          .forEach(workout => this._renderWorkout(workout));
        containerWorkouts.classList.add('small-big');
      }
    } else {
      const allWorkouts = containerWorkouts.querySelectorAll('.workout');
      allWorkouts.forEach(el => {
        const workout = this.#workouts.find(w => w.id === el.dataset.id);
        this.#sortedWorkouts.push(workout);
        this.#sortedWorkouts.sort((a, b) => (a.distance > b.distance ? 1 : -1));
        this._cleareContainer();
        this.#sortedWorkouts.forEach(workout => this._renderWorkout(workout));
        containerWorkouts.classList.add('sorted');
      });
    }
  }
  _cleareContainer() {
    containerWorkouts.querySelectorAll('.workout').forEach(el => el.remove());
  }
  _showAllWorkouts(e) {
    e.preventDefault();
    if (!e.target.closest('.center-map')) return;
    const lats = this.#workouts.slice().map(w => w.coords[0]);
    const lngs = this.#workouts.slice().map(w => w.coords[1]);
    const maxLat = Math.max(...lats);
    const minLat = Math.min(...lats);
    const maxLng = Math.max(...lngs);
    const minLng = Math.min(...lngs);

    this.#map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [50, 50] }
    );
  }
  _showAlert(type) {
    errorMessage.classList.remove('hidden');
    errorMessage.querySelector('.message').textContent =
      type === 'running'
        ? `Wszystkie wartości powinny być dodatnimi liczbami`
        : `"Elev gain" powinna być liczą, a pozostałe 
        wartości powinny być dodatnimi liczbami`;

    errorMessage.querySelector('.btn').focus();
    errorMessage.querySelectorAll('.btn').forEach(el =>
      el.addEventListener('click', function () {
        errorMessage.classList.add('hidden');
        form.querySelector('.form__input--distance').focus();
      })
    );
  }
  async _showError(message) {
    const errorBox = errorMessage.querySelector('.error--box');
    const messageElement = errorBox.querySelector('.message');
    const okBtn = errorBox.querySelector('.btn.ok');
    const rejectBtn = errorBox.querySelector('.btn.reject');

    // Set the error message
    messageElement.textContent = message;

    // Display the error container
    errorMessage.classList.remove('hidden');

    // Create a promise to handle the confirmation
    return new Promise(resolve => {
      // Event listener for the OK button
      okBtn.addEventListener('click', () => {
        // Hide the error container
        errorMessage.classList.add('hidden');
        // Resolve the promise with true
        resolve(true);
      });

      // Event listener for the Reject button
      rejectBtn.addEventListener('click', () => {
        // Hide the error container
        errorMessage.classList.add('hidden');
        // Resolve the promise with false
        resolve(false);
      });
    });
  }
  _showMapLayers() {}
}
const app = new App();
