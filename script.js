'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

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
  constructor() {
    //API geolocation // get Position
    this._getPosition();

    //get locale storage
    this._getLocalStorage();

    //add event handlers
    form.addEventListener('submit', this._newWorkout.bind(this)); //add bind(this) to use class vars
    inputType.addEventListener('change', this._toogleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
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
    const allPositive = (...values) => values.every(val => val >= 0);

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
        return alert('Enter the positive number!');
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
        return alert('Enter the positive number!');
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
    L.marker(workout.coords)
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
    </li> 
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
    </li> 
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

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
    console.log(data);
    if (!data) return;

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
}
const app = new App();
// app._getPosition();
