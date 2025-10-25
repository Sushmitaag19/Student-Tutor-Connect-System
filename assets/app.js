
(function () {
	const STORAGE_KEYS = {
		student: 'stcs_student',
		tutor: 'stcs_tutor',
		tutors: 'stcs_tutors_list',
		selectedSubject: 'stcs_selected_subject'
	};

	const questionsBySubject = {
		"Math": [
			"Solve: If f(x) = x^2, what is f'(x)?",
			"Explain the difference between mean and median.",
			"How do you teach factoring quadratic equations to beginners?"
		],
		"Physics": [
			"State Newton's second law and provide an example.",
			"What is the difference between speed and velocity?",
			"How would you explain conservation of energy to a Grade 10 student?"
		],
		"English": [
			"How do you teach essay structure to improve coherence?",
			"Explain the difference between their/there/they're.",
			"What activities help with vocabulary retention?"
		],
		"Computer Science": [
			"Explain time complexity of a binary search.",
			"How would you teach variables and loops to a beginner?",
			"What is the difference between stack and queue?"
		]
	};

	const defaultTutors = [
		{ id: 1, name: 'Aarav Sharma', subjects: ['Math'], rate: 800, mode: 'Online', location: 'Kathmandu', experienceYears: 3 },
		{ id: 2, name: 'Maya Gurung', subjects: ['Physics'], rate: 1000, mode: 'Offline', location: 'Pokhara', experienceYears: 5 },
		{ id: 3, name: 'Sita Rai', subjects: ['English'], rate: 700, mode: 'Online', location: 'Lalitpur', experienceYears: 2 },
		{ id: 4, name: 'Ramesh Karki', subjects: ['Computer Science'], rate: 1200, mode: 'Online', location: 'Bhaktapur', experienceYears: 4 }
	];

	function getItem(key) {
		try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
	}
	function setItem(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

	function ensureDefaultTutors() {
		if (!getItem(STORAGE_KEYS.tutors)) {
			setItem(STORAGE_KEYS.tutors, defaultTutors);
		}
	}

	function navigate(url) { window.location.href = url; }

	function bindGlobalNav() {
		const signInBtn = document.getElementById('sign-in');
		if (signInBtn) {
			signInBtn.addEventListener('click', function () { navigate('register.html'); });
		}
		const loginBtn = document.getElementById('login');
		if (loginBtn) {
			loginBtn.addEventListener('click', function () { navigate('register.html'); });
		}
		const ctas = document.querySelectorAll('.login');
		ctas.forEach(function (btn) {
			btn.addEventListener('click', function () { navigate('register.html'); });
		});
	}

	function initRegisterPage() {
		const tutorBtn = document.getElementById('for-tutor');
		const studentBtn = document.getElementById('for-student');
		if (tutorBtn) tutorBtn.addEventListener('click', function () { navigate('tutor-signup.html'); });
		if (studentBtn) studentBtn.addEventListener('click', function () { navigate('student-signup.html'); });
	}

	function initStudentSignup() {
		const form = document.getElementById('student-signup-form');
		if (!form) return;
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			const data = {
				name: form.name.value.trim(),
				email: form.email.value.trim(),
				password: form.password.value.trim(),
				subject: form.subject.value,
				mode: form.mode.value,
				location: form.location.value.trim(),
				budget: Number(form.budget.value)
			};
			setItem(STORAGE_KEYS.student, data);
			navigate('student-dashboard.html');
		});
	}

	function initTutorSignup() {
		const form = document.getElementById('tutor-signup-form');
		if (!form) return;
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			const data = {
				name: form.name.value.trim(),
				email: form.email.value.trim(),
				password: form.password.value.trim(),
				subject: form.subject.value,
				experience: Number(form.experience.value),
				rate: Number(form.rate.value),
				mode: form.mode.value,
				location: form.location.value.trim()
			};
			setItem(STORAGE_KEYS.tutor, data);
			setItem(STORAGE_KEYS.selectedSubject, data.subject);
			navigate('tutor-onboarding.html');
		});
	}

	function initTutorOnboarding() {
		const container = document.getElementById('question-container');
		const form = document.getElementById('tutor-questions-form');
		if (!container || !form) return;
		const subject = getItem(STORAGE_KEYS.selectedSubject) || 'Math';
		const qs = questionsBySubject[subject] || [];
		container.innerHTML = '';
		qs.forEach(function (q, idx) {
			const wrapper = document.createElement('div');
			wrapper.className = 'question';
			const label = document.createElement('label');
			label.textContent = (idx + 1) + '. ' + q;
			const textarea = document.createElement('textarea');
			textarea.name = 'q_' + idx;
			textarea.required = true;
			wrapper.appendChild(label);
			wrapper.appendChild(textarea);
			container.appendChild(wrapper);
		});
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			const tutor = getItem(STORAGE_KEYS.tutor) || {};
			tutor.onboardingCompleted = true;
			setItem(STORAGE_KEYS.tutor, tutor);
			navigate('tutor-dashboard.html');
		});
	}

	function initStudentDashboard() {
		ensureDefaultTutors();
		const student = getItem(STORAGE_KEYS.student);
		const tutors = getItem(STORAGE_KEYS.tutors) || [];
		const list = document.getElementById('tutor-list');
		const nameHolder = document.getElementById('student-name');
		if (nameHolder && student) nameHolder.textContent = student.name || 'Student';
		if (!list) return;
		let filtered = tutors;
		if (student && student.subject) {
			filtered = filtered.filter(function (t) { return (t.subjects || []).includes(student.subject); });
		}
		if (student && student.mode) {
			filtered = filtered.filter(function (t) { return !student.mode || t.mode === student.mode; });
		}
		list.innerHTML = '';
		filtered.forEach(function (t) {
			const li = document.createElement('li');
			li.className = 'tutor-item';
			li.textContent = t.name + ' — ' + t.subjects.join(', ') + ' — NPR ' + t.rate + '/hr — ' + t.mode + ' — ' + t.location;
			list.appendChild(li);
		});
	}

	function initTutorDashboard() {
		const tutor = getItem(STORAGE_KEYS.tutor);
		const nameHolder = document.getElementById('tutor-name');
		const statusHolder = document.getElementById('tutor-status');
		if (nameHolder && tutor) nameHolder.textContent = tutor.name || 'Tutor';
		if (statusHolder) statusHolder.textContent = tutor && tutor.onboardingCompleted ? 'Onboarding complete' : 'Pending onboarding';
	}

	document.addEventListener('DOMContentLoaded', function () {
		bindGlobalNav();
		const page = document.body && document.body.getAttribute('data-page');
		switch (page) {
			case 'register':
				initRegisterPage();
				break;
			case 'student-signup':
				initStudentSignup();
				break;
			case 'tutor-signup':
				initTutorSignup();
				break;
			case 'tutor-onboarding':
				initTutorOnboarding();
				break;
			case 'student-dashboard':
				initStudentDashboard();
				break;
			case 'tutor-dashboard':
				initTutorDashboard();
				break;
			default:
				break;
		}
	});
})(); 