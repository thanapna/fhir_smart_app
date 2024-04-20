const client = FHIR.client("https://r4.smarthealthit.org");

FHIR.oauth2.ready()
    .then(client => {
        // Now you have the authenticated FHIR client ready to use
        // You can access the patient ID with `client.patient.id`
        // and make a FHIR request to get the patient's details
        return client.request(`Patient/${client.patient.id}`);
    })
    .then(patient => {
        // Here you receive the patient resource
        console.log('Patient ID:', client.patient.id);
        // You can now display this patient data in your application
        fetchPatientDetails(client.patient.id);
    })
    .catch(error => {
        console.error('Failed to retrieve patient data:', error);
        alert('Error retrieving patient data.');
    });

function fetchPatientDetails(patientId) {
    client.request(`Patient/${patientId}`).then(patient => {
        console.log("Patient Details:", patient);
        displayPatientDetails(patient);
        
		fetchEncounters(patientId);
        fetchConditions(patientId);
        fetchObservationsL(patientId, 'laboratory');
        fetchObservationsV(patientId, 'vital-signs');
        fetchMedicationRequests(patientId);
		fetchBloodPressureData(patientId);
    }).catch(err => {
        console.error("Error fetching patient details:", err);
        alert("Failed to load patient details.");
    });
}

function displayPatientDetails(patient) {
    document.getElementById("patientId").textContent = patient.id;
    document.getElementById("patientMrn").textContent = patient.identifier?.find(id => id.system === 'http://hospital.smarthealthit.org')?.value || "N/A";
    document.getElementById("patientName").textContent = formatHumanName(patient.name[0]);
    document.getElementById("patientGender").textContent = patient.gender;
    document.getElementById("patientBirthDate").textContent = patient.birthDate;
    document.getElementById("patientTelephone").textContent = patient.telecom?.find(t => t.system === 'phone')?.value || "N/A";
    document.getElementById("patientAddress").textContent = formatAddress(patient.address[0]);
	document.getElementById("patientDetailsSection").style.display = "block";
}

function formatHumanName(name) {
    return name ? `${name.given.join(' ')} ${name.family}` : '';
}

function formatAddress(address) {
    return address ? `${address.line.join(', ')} ${address.city}, ${address.state} ${address.postalCode}, ${address.country}` : '';
}

// Function to fetch and display visit history for a given patient
function fetchEncounters(patientId) {
    console.log("Fetching encounters for Patient ID:", patientId);
    client.request(`Encounter?patient=${patientId}&_sort=-date&_count=10`).then(data => {
        console.log("Encounter Data:", data);
        displayVisitHistory(data.entry || []);
    }).catch(err => {
        console.error("Error fetching visit history:", err);
        alert("Failed to load visit history.");
    });
}

// Function to display visit history in the table
function displayVisitHistory(encounters) {
    const tableElement  = document.getElementById("visitHistoryTable");
	const tbodyElement = tableElement.tBodies;
	let tbody = tbodyElement[0];
    tbody.innerHTML = '';  // Clear previous entries
	
    encounters.forEach(entry => {
        const encounter = entry.resource;
        let tr = document.createElement("tr");
        let tdType = document.createElement("td");
        let tdStart = document.createElement("td");
        let tdEnd = document.createElement("td");

        tdType.textContent = encounter.type?.map(type => type.text).join(", ") || "Not specified";
        tdStart.textContent = encounter.period?.start ? new Date(encounter.period.start).toLocaleDateString() : "Not available";
        tdEnd.textContent = encounter.period?.end ? new Date(encounter.period.end).toLocaleDateString() : "Not available";

        tr.appendChild(tdType);
        tr.appendChild(tdStart);
        tr.appendChild(tdEnd);
        tbody.appendChild(tr);
    });

    if (encounters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No visit history available.</td></tr>';
    }

	const visitHistoryTable = document.getElementById('visitHistoryTable');
	if (visitHistoryTable) {
		new simpleDatatables.DataTable(visitHistoryTable);
	}
	
    document.getElementById("visitHistorySection").style.display = "block";  // Make sure the section is visible
}

function fetchConditions(patientId) {
    const url = `Condition?patient=${patientId}&_sort=-onset-date&_count=10`;
    console.log("URL for API request:", url); // This will show you exactly what URL is being used
    client.request(url)
    .then(data => {
        if (data.entry) {
            displayProblemLists(data.entry);
        } else {
            console.log("No conditions found for this patient.");
            displayProblemLists([]);  // Handle empty results gracefully
        }
    })
    .catch(err => {
        console.error("Error fetching problem lists:", err);
        alert("Failed to load problem lists. See console for details.");
    });
}


// Adjust display logic as needed
function displayProblemLists(conditions) {
	const tableElement  = document.getElementById("problemListsTable");
	const tbodyElement = tableElement.tBodies;
	let tbody = tbodyElement[0];
    tbody.innerHTML = '';  // Clear previous entries
    conditions.forEach(entry => {
        const condition = entry.resource;
        let tr = document.createElement("tr");
        let tdProblem = document.createElement("td");
        tdProblem.textContent = condition.code?.text || "Not specified";
        let tdClinicalStatus = document.createElement("td");
        tdClinicalStatus.textContent = condition.clinicalStatus?.coding?.[0]?.code || "Not specified";
        let tdVerificationStatus = document.createElement("td");
        tdVerificationStatus.textContent = condition.verificationStatus?.coding?.[0]?.code || "Not specified";
        let tdOnsetDate = document.createElement("td");
        tdOnsetDate.textContent = condition.onsetDateTime ? new Date(condition.onsetDateTime).toLocaleDateString() : "Not available";
        tr.appendChild(tdProblem);
        tr.appendChild(tdClinicalStatus);
        tr.appendChild(tdVerificationStatus);
        tr.appendChild(tdOnsetDate);
        tbody.appendChild(tr);
    });
    if (conditions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No problem lists available.</td></tr>';
    }
	
    document.getElementById("problemListsSection").style.display = "block";  // Make sure the section is visible
	
	const problemListsTable = document.getElementById('problemListsTable');
	if (problemListsTable) {
		new simpleDatatables.DataTable(problemListsTable);
	}
}

// Function to fetch and display lab results for a given patient
function fetchObservationsL(patientId, category) {
    // Adjust the URL for the specific category and relevant search parameters
    client.request(`Observation?patient=${patientId}&category=${category}&_sort=-date&_count=10`)
    .then(data => {
        if (category === 'laboratory') {
            displayLabResults(data.entry || []);
        } else {
            console.error("Category not supported for display:", category);
        }
    })
    .catch(err => {
        console.error(`Error fetching ${category} observations:`, err);
        alert(`Failed to load ${category} observations. See console for details.`);
    });
}

// Helper function to format the value to two decimal places safely
function formatValue(value) {
    return (value !== null && value !== undefined) ? Number(value).toFixed(2) : "N/A";
}

// Function to display lab results in the table
function displayLabResults(observations) {
	const tableElement  = document.getElementById("labResultsTable");
	const tbodyElement = tableElement.tBodies;
	let tbody = tbodyElement[0];
    tbody.innerHTML = '';  // Clear previous entries

    observations.forEach(entry => {
        const observation = entry.resource;
        let tr = document.createElement("tr");
        let tdName = document.createElement("td");
        let tdValue = document.createElement("td");
        let tdUnit = document.createElement("td");
        let tdDate = document.createElement("td");

        // Extract and display lab test name
        tdName.textContent = observation.code?.text || "Not specified";

        // Display the value and unit of the lab test
        tdValue.textContent = formatValue(observation.valueQuantity?.value);
        tdUnit.textContent = observation.valueQuantity?.unit || "N/A";

        // Handling the date of the lab test
        tdDate.textContent = observation.effectiveDateTime ? new Date(observation.effectiveDateTime).toLocaleDateString() : "Not available";

        tr.appendChild(tdName);
        tr.appendChild(tdValue);
        tr.appendChild(tdUnit);
        tr.appendChild(tdDate);
        tbody.appendChild(tr);
    });

    if (observations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No lab results available.</td></tr>';
    }

    document.getElementById("labResultsSection").style.display = "block";  // Make sure the section is visible
	const labResultsTable = document.getElementById('labResultsTable');
	if (labResultsTable) {
		new simpleDatatables.DataTable(labResultsTable);
	}
	
}

// Function to fetch and display vital signs for a given patient
function fetchObservationsV(patientId, category) {
    // Adjust the URL for the specific category and relevant search parameters
    client.request(`Observation?patient=${patientId}&category=${category}&_sort=-date&_count=10`)
    .then(data => {
        if (category === 'vital-signs') {
            displayVitalSigns(data.entry || []);
        } else {
            console.error("Category not supported for display:", category);
        }
    })
    .catch(err => {
        console.error(`Error fetching ${category} observations:`, err);
        alert(`Failed to load ${category} observations. See console for details.`);
    });
}

// Function to display vital signs in the table
function displayVitalSigns(observations) {
    const tableElement  = document.getElementById("vitalSignsTable");
	const tbodyElement = tableElement.tBodies;
	let tbody = tbodyElement[0];
    tbody.innerHTML = '';  // Clear previous entries

    observations.forEach(entry => {
        const observation = entry.resource;
        let tr = document.createElement("tr");
        let tdName = document.createElement("td");
        let tdValue = document.createElement("td");
        let tdUnit = document.createElement("td");
        let tdDate = document.createElement("td");

        if (observation.code.text === "Blood Pressure" && observation.component) {
            // Handling blood pressure with multiple components
            observation.component.forEach((component, index) => {
                if (index > 0) tr = document.createElement("tr");  // Create new row for each component after the first
                tdName.textContent = component.code.text || "Not specified";
                tdValue.textContent = formatValue(component.valueQuantity.value);
                tdUnit.textContent = component.valueQuantity.unit || "N/A";
                tdDate.textContent = observation.effectiveDateTime ? new Date(observation.effectiveDateTime).toLocaleDateString() : "Not available";
                tr.appendChild(tdName.cloneNode(true));
                tr.appendChild(tdValue.cloneNode(true));
                tr.appendChild(tdUnit.cloneNode(true));
                tr.appendChild(tdDate.cloneNode(true));
                tbody.appendChild(tr);
            });
        } else {
            // Regular handling for other vital signs
            tdName.textContent = observation.code.text || "Not specified";
            tdValue.textContent = formatValue(observation.valueQuantity.value);
            tdUnit.textContent = observation.valueQuantity.unit || "N/A";
            tdDate.textContent = observation.effectiveDateTime ? new Date(observation.effectiveDateTime).toLocaleDateString() : "Not available";
            tr.appendChild(tdName);
            tr.appendChild(tdValue);
            tr.appendChild(tdUnit);
            tr.appendChild(tdDate);
            tbody.appendChild(tr);
        }
    });

    if (observations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No vital signs available.</td></tr>';
    }

    document.getElementById("vitalSignsSection").style.display = "block";  // Make sure the section is visible
	const vitalSignsTable = document.getElementById('vitalSignsTable');
	if (vitalSignsTable) {
		new simpleDatatables.DataTable(vitalSignsTable);
	}
}

// Function to fetch and display medication history for a given patient
function fetchMedicationRequests(patientId) {
    client.request(`MedicationRequest?patient=${patientId}&_sort=-authoredon&_count=10`)
    .then(data => {
        displayMedicationHistory(data.entry || []);
    })
    .catch(err => {
        console.error("Error fetching medication history:", err);
        alert("Failed to load medication history. See console for details.");
    });
}

// Function to display medication history in the table
function displayMedicationHistory(medications) {
    const tableElement  = document.getElementById("medicationHistoryTable");
	const tbodyElement = tableElement.tBodies;
	let tbody = tbodyElement[0];
    tbody.innerHTML = '';  // Clear previous entries

    medications.forEach(entry => {
        const medicationRequest = entry.resource;
        let tr = document.createElement("tr");
        let tdName = document.createElement("td");
        let tdStatus = document.createElement("td");
        let tdDate = document.createElement("td");

        // Extract and display medication name
        tdName.textContent = medicationRequest.medicationCodeableConcept?.text || "Not specified";

        // Display the status of the medication
        tdStatus.textContent = medicationRequest.status || "N/A";

        // Handling the authored date
        tdDate.textContent = medicationRequest.authoredOn ? new Date(medicationRequest.authoredOn).toLocaleDateString() : "Not available";

        tr.appendChild(tdName);
        tr.appendChild(tdStatus);
        tr.appendChild(tdDate);
        tbody.appendChild(tr);
    });

    if (medications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No medication history available.</td></tr>';
    }

    document.getElementById("medicationHistorySection").style.display = "block";  // Make sure the section is visible
	const medicationHistoryTable = document.getElementById('medicationHistoryTable');
	if (medicationHistoryTable) {
		new simpleDatatables.DataTable(medicationHistoryTable);
	}
}


// Function to initiate fetching blood pressure data
function fetchBloodPressureData(patientId) {
    // First fetch the most recent blood pressure reading to determine the latest date
    client.request(`Observation?patient=${patientId}&category=vital-signs&code=55284-4&_sort=-date`)
    .then(data => {
    		console.log("Fetched latest observation:", data);
        if (data.entry && data.entry.length > 0) {
            const bloodPressureData = prepareBloodPressureData(data.entry);
            renderBloodPressureChart(bloodPressureData);
        } else {
            console.error("No blood pressure data found.");
            alert("No recent blood pressure data available.");
        }
    })
    .catch(err => {
        console.error("Error fetching the most recent blood pressure data:", err);
        alert("Failed to load the most recent blood pressure data. See console for details.");
    });
}

// Function to prepare data for Highcharts
function prepareBloodPressureData(entries) {
    let systolicData = [];
    let diastolicData = [];

    entries.forEach(entry => {
        const observation = entry.resource;
        const effectiveDate = observation.effectiveDateTime ? new Date(observation.effectiveDateTime).getTime() : null;
        if (observation.component) {
            observation.component.forEach(component => {
                const componentType = component.code.text || component.code.coding[0].display;
                if (component.code.text.includes("Systolic")) {
                    systolicData.push([effectiveDate, parseFloat(component.valueQuantity.value)]);
                } else if (component.code.text.includes("Diastolic")) {
                    diastolicData.push([effectiveDate, parseFloat(component.valueQuantity.value)]);
                }
            });
        }
    });

    return { systolic: systolicData, diastolic: diastolicData };
}

// Function to prepare and plot blood pressure data using Highcharts
function renderBloodPressureChart(data) {
    Highcharts.chart('bloodPressureChart', {
        chart: {
            type: 'line'
        },
        title: {
            text: 'Blood Pressure Trends'
        },
        xAxis: {
            type: 'datetime',
            title: {
                text: 'Date'
            }
        },
        yAxis: {
            title: {
                text: 'Blood Pressure (mmHg)'
            }
        },
        series: [{
            name: 'Systolic Blood Pressure',
            data: data.systolic
        }, {
            name: 'Diastolic Blood Pressure',
            data: data.diastolic
        }],
        tooltip: {
            headerFormat: '<b>{series.name}</b><br>',
            pointFormat: '{point.x:%e %b %Y}: {point.y:.0f} mmHg'
        }
    });
}
