(() => {
  'use strict';

  const schedule = {
    1: {
      short: 'MON',
      name: 'Monday',
      lessons: [
        ['08:00', '08:50', 'Foreign Language 1 (B1)', 'Practice', 'C1.1.225P'],
        ['09:00', '09:50', 'Foreign Language 1 (B1)', 'Practice', 'C1.1.225P'],
        ['10:00', '10:50', 'Discrete Mathematics', 'Lecture', 'C1.3.264L'],
        ['11:00', '11:50', 'Discrete Mathematics', 'Lecture', 'C1.3.264L'],
        ['12:00', '12:50', 'Introduction to Programming', 'Practice', 'C1.3.323K'],
        ['13:05', '13:55', 'Introduction to Programming', 'Practice', 'C1.3.323K']
      ]
    },
    2: {
      short: 'TUE',
      name: 'Tuesday',
      lessons: [
        ['10:00', '10:50', 'Information and Communication Technologies', 'Practice', 'C1.1.357K'],
        ['11:00', '11:50', 'Information and Communication Technologies', 'Practice', 'C1.1.357K'],
        ['12:00', '12:50', 'Introduction to Programming', 'Practice', 'C1.3.323K'],
        ['16:00', '16:50', 'Introduction to Programming', 'Lecture', 'Online'],
        ['17:00', '17:50', 'Introduction to Programming', 'Lecture', 'Online']
      ]
    },
    3: {
      short: 'WED',
      name: 'Wednesday',
      lessons: [
        ['10:00', '10:50', 'Psychology', 'Lecture', 'C1.3.370L'],
        ['11:00', '11:50', 'Sociology', 'Lecture', 'C1.3.370L'],
        ['12:00', '12:50', 'Discrete Mathematics', 'Practice', 'C1.2.226P'],
        ['13:05', '13:55', 'Discrete Mathematics', 'Practice', 'C1.2.226P'],
        ['18:00', '18:50', 'Information and Communication Technologies', 'Lecture', 'Online'],
        ['19:00', '19:50', 'Information and Communication Technologies', 'Lecture', 'Online']
      ]
    },
    4: {
      short: 'THU',
      name: 'Thursday',
      lessons: []
    },
    5: {
      short: 'FRI',
      name: 'Friday',
      lessons: [
        ['08:00', '08:50', 'Discrete Mathematics', 'Lecture', 'C1.1.328L'],
        ['10:00', '10:50', 'Sociology', 'Practice', 'C1.3.244'],
        ['19:00', '19:50', 'Information and Communication Technologies', 'Lecture', 'Online']
      ]
    },
    6: {
      short: 'SAT',
      name: 'Saturday',
      lessons: [
        ['08:00', '08:50', 'Foreign Language 1 (B1)', 'Practice', 'C1.1.225P'],
        ['09:00', '09:50', 'Psychology', 'Practice', 'C1.3.232P'],
        ['14:00', '14:50', 'Physical Education', 'Practice', '-'],
        ['15:00', '15:50', 'Physical Education', 'Practice', '-'],
        ['18:00', '18:50', 'Foreign Language 1 (B1)', 'Practice', 'Online'],
        ['19:00', '19:50', 'Foreign Language 1 (B1)', 'Practice', 'Online']
      ]
    }
  };

  const $ = selector => document.querySelector(selector);

  const elements = {
    tabs: $('#dayTabs'),
    schedule: $('#schedule'),
    dayName: $('#dayName'),
    count: $('#lessonCount'),
    eyebrow: $('#todayLabel'),
    title: $('#heroTitle'),
    date: $('#dateLabel'),
    status: $('#statusCard'),
    statusText: $('#statusText'),
    dialog: $('#mapDialog'),
    frame: $('#mapFrame'),
    mapTitle: $('#mapTitle'),
    mapContext: $('#mapContext'),
    mapTab: $('#openMapTab'),
    notify: $('#notifyButton'),
    toast: $('#toast')
  };

  const timeToMinutes = value => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const plural = count => (count === 1 ? 'class' : 'classes');

  const dateTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Almaty',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  function nowInAlmaty() {
    const p = Object.fromEntries(
      dateTime
        .formatToParts(new Date())
        .filter(x => x.type !== 'literal')
        .map(x => [x.type, x.value])
    );

    const day = new Date(
      Date.UTC(+p.year, +p.month - 1, +p.day)
    ).getUTCDay();

    return {
      day,
      minutes: +p.hour * 60 + +p.minute,
      key: `${p.year}-${p.month}-${p.day}`
    };
  }

  function recommendedDay() {
    const now = nowInAlmaty();

    if (now.day === 0) return 1;
    if (now.minutes >= 18 * 60) return now.day === 6 ? 1 : now.day + 1;

    return now.day;
  }

  let activeDay = Math.min(
    6,
    Math.max(
      1,
      Number(sessionStorage.getItem('activeDay')) || recommendedDay()
    )
  );

  let toastTimer;

  function toast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 3200);
  }

  function renderTabs() {
    const today = nowInAlmaty().day;

    elements.tabs.replaceChildren(
      ...Object.entries(schedule).map(([number, day]) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.className =
          `day-tab${+number === activeDay ? ' active' : ''}` +
          `${+number === today ? ' today' : ''}`;

        button.dataset.day = number;
        button.setAttribute(
          'aria-pressed',
          String(+number === activeDay)
        );

        button.innerHTML = `
          ${day.short}
          <span>
            ${+number === today
              ? 'Today'
              : `${day.lessons.length} ${plural(day.lessons.length)}`}
          </span>
        `;

        return button;
      })
    );

    elements.tabs
      .querySelector('.active')
      ?.scrollIntoView({
        inline: 'nearest',
        block: 'nearest'
      });
  }

  function lessonNode(lesson, isToday, nowMinutes) {
    const [start, end, name, type, place] = lesson;

    const current =
      isToday &&
      timeToMinutes(start) <= nowMinutes &&
      nowMinutes < timeToMinutes(end);

    const past =
      isToday &&
      timeToMinutes(end) <= nowMinutes;

    const article = document.createElement('article');

    article.className =
      `lesson${current ? ' current' : ''}` +
      `${past ? ' past' : ''}`;

    if (current) {
      article.setAttribute('aria-current', 'time');
    }

    const hasRoom = place !== 'Online' && place !== '-';

    article.innerHTML = `
      <time class="lesson__time" datetime="${start}">
        ${start}
        <span>until ${end}</span>
      </time>

      <div>
        <div class="lesson__name">${name}</div>

        <div class="lesson__meta">
          <span class="badge${type === 'Lecture' ? ' lecture' : ''}">
            ${type}
          </span>

          ${place === 'Online'
            ? '<span class="badge online">Online</span>'
            : ''}
        </div>
      </div>

      ${hasRoom
        ? `
          <button
            class="room-button"
            type="button"
            data-room="${place}"
            data-subject="${name}"
          >
            <span aria-hidden="true">→</span>
            ${place}
          </button>
        `
        : `
          <span class="room-placeholder">
            ${place === 'Online' ? 'Remote' : 'Gym'}
          </span>
        `}
    `;

    return article;
  }

  function render() {
    const day = schedule[activeDay];
    const now = nowInAlmaty();
    const isToday = activeDay === now.day;

    sessionStorage.setItem('activeDay', String(activeDay));

    renderTabs();

    elements.dayName.textContent = day.name;

    elements.count.textContent = day.lessons.length
      ? `${day.lessons.length} ${plural(day.lessons.length)}`
      : 'Free day';

    elements.eyebrow.textContent = isToday
      ? 'TODAY'
      : 'SCHEDULE';

    elements.title.textContent = isToday
      ? 'Study day'
      : day.name;

    elements.date.textContent = dateLabel
      .format(new Date())
      .replace(/^./, character => character.toUpperCase());

    if (day.lessons.length) {
      elements.schedule.replaceChildren(
        ...day.lessons.map(item =>
          lessonNode(item, isToday, now.minutes)
        )
      );
    } else {
      const empty = document.createElement('div');

      empty.className = 'empty';
      empty.innerHTML = `
        <span class="empty__icon" aria-hidden="true">✓</span>
        <strong>No classes</strong>
        <span>You can plan your day freely.</span>
      `;

      elements.schedule.replaceChildren(empty);
    }

    updateStatus();
  }

  function updateStatus() {
    const { day, minutes } = nowInAlmaty();
    const lessons = schedule[activeDay].lessons;

    elements.status.className = 'status-card';

    if (activeDay !== day) {
      elements.statusText.textContent = lessons.length
        ? `First class at ${lessons[0][0]} · ${lessons.length} in total`
        : 'No classes - free day';

      return;
    }

    const current = lessons.find(
      lesson =>
        timeToMinutes(lesson[0]) <= minutes &&
        minutes < timeToMinutes(lesson[1])
    );

    const next = lessons.find(
      lesson => timeToMinutes(lesson[0]) > minutes
    );

    if (current) {
      elements.status.classList.add('live');

      elements.statusText.textContent =
        `Now: ${current[2]} · ` +
        `${timeToMinutes(current[1]) - minutes} min remaining`;
    } else if (next) {
      const wait = timeToMinutes(next[0]) - minutes;

      if (wait <= 15) {
        elements.status.classList.add('soon');
      }

      elements.statusText.textContent =
        `Next: ${next[2]} at ${next[0]}` +
        `${wait <= 60 ? ` · in ${wait} min` : ''}`;
    } else {
      elements.statusText.textContent = lessons.length
        ? "Today's classes are over"
        : 'No classes today';
    }
  }

  function mapUrl(room = '') {
    return `aitumap/index.html?v=6${
      room ? `&room=${encodeURIComponent(room)}` : ''
    }`;
  }

  function openMap(room = '', subject = '') {
    const url = mapUrl(room);

    if (elements.frame.src !== new URL(url, location.href).href) {
      elements.frame.src = url;
    }

    elements.mapTab.href = url;
    elements.mapTitle.textContent = room || 'AITU Map';
    elements.mapContext.textContent = subject
      ? subject.toUpperCase()
      : 'CAMPUS MAP';

    elements.dialog.showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeMap() {
    elements.dialog.close();
    document.body.style.overflow = '';
  }

  elements.tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-day]');

    if (!button) return;

    activeDay = +button.dataset.day;
    render();
  });

  elements.schedule.addEventListener('click', event => {
    const button = event.target.closest('[data-room]');

    if (button) {
      openMap(button.dataset.room, button.dataset.subject);
    }
  });

  $('#openCampusMap').addEventListener('click', () => openMap());
  $('#closeMap').addEventListener('click', closeMap);

  elements.dialog.addEventListener('click', event => {
    if (event.target === elements.dialog) {
      closeMap();
    }
  });

  elements.dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
  });

  $('#expandMap').addEventListener('click', event => {
    elements.dialog.classList.toggle('expanded');

    event.currentTarget.textContent =
      elements.dialog.classList.contains('expanded')
        ? '↙'
        : '⛶';
  });

  function syncNotifications() {
    const on =
      localStorage.getItem('lessonReminders') === 'on' &&
      'Notification' in window &&
      Notification.permission === 'granted';

    elements.notify.classList.toggle('on', on);
    elements.notify.setAttribute('aria-pressed', String(on));
  }

  elements.notify.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      toast('This browser does not support notifications');
      return;
    }

    if (localStorage.getItem('lessonReminders') === 'on') {
      localStorage.removeItem('lessonReminders');
      syncNotifications();
      toast('Reminders turned off');
      return;
    }

    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;

    if (permission === 'granted') {
      localStorage.setItem('lessonReminders', 'on');
      syncNotifications();
      toast('Reminders are enabled while this tab is open');
      checkReminder();
    } else {
      toast('Allow notifications in your browser settings');
    }
  });

  function checkReminder() {
    if (
      localStorage.getItem('lessonReminders') !== 'on' ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const now = nowInAlmaty();

    if (now.day < 1 || now.day > 6) return;

    const lesson = schedule[now.day].lessons.find(item => {
      const difference =
        timeToMinutes(item[0]) - now.minutes;

      return difference >= 0 && difference <= 10;
    });

    if (!lesson) return;

    const key = `reminded:${now.key}:${lesson[0]}`;

    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, '1');

    new Notification(
      `In ${Math.max(
        0,
        timeToMinutes(lesson[0]) - now.minutes
      )} min: ${lesson[2]}`,
      {
        body: `${lesson[0]} · ${lesson[4]}`,
        tag: key
      }
    );
  }

  document.addEventListener('keydown', event => {
    if (
      elements.dialog.open ||
      /INPUT|TEXTAREA/.test(event.target.tagName)
    ) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      activeDay = activeDay <= 1 ? 6 : activeDay - 1;
      render();
    }

    if (event.key === 'ArrowRight') {
      activeDay = activeDay >= 6 ? 1 : activeDay + 1;
      render();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      render();
      checkReminder();
    }
  });

  syncNotifications();
  render();
  checkReminder();

  setInterval(() => {
    updateStatus();
    checkReminder();
  }, 60000);

  const deepRoom = new URLSearchParams(
    location.hash.slice(1)
  ).get('room');

  if (deepRoom) {
    openMap(deepRoom, 'Selected room');
  }
})();