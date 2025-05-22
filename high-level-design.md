# **Final Project Design Doc**
Below is a high level design of the project. Goal is to make the project clear while developing it.
## **Overview \- High Level Description of the project**

The System is an AI/ML-powered platform designed to optimize school timetables by balancing hard constraints (e.g., no course conflicts, room capacities) with soft constraints (e.g., teacher preferences, accessibility). The system is intended for educational institutions, universities for the moment, to modernize their scheduling processes. Unlike traditional rule-based systems, this system leverages advanced optimization techniques to provide scalable, flexible, and user-friendly solutions for educational institutions. Its primary goal is to minimize manual intervention, improve satisfaction among stakeholders, and enable efficient resource utilization.

## **Functionality/Features/**

## Core Functionalities

1. ### **Schedule Generation**

* Automatically generate schedules that satisfy hard and soft constraints.   
* Hard Constraints:   
- Room Schedule Overlap (taking the room type like labs into account)  
- Teacher Schedule Overlap  
- Student Group overlap  
- Timeslot Validity (no classes during lunch, or after 10:00 for eg)  
* Soft Constraints:   
- Time preference for teachers  
- Schedule classes in a week with the maximum/minimum possible gap in days.(? Not sure which one to go for, as it depends on teacher preferences too)  
- Scheduling the harder courses earlier in the day. (can be determined from the course ECTS)  
- Floor considerations based on disability (should be in hard constraints, but i want to make it easier for the scheduler for now).  

* Should narrow down soft and hard constraints soon as well.

2. ### **Conflict Detection and Resolution**

* Detecting scheduling conflicts? If we add manual overrides for admins, maybe showing when there are conflicts would be a good idea.

3. ### **Teacher Input for preferences**

* Have teachers specify working hours, room or location preferences, etc…  
* Generate user-friendly views of the schedule (e.g., grid or calendar format).  
* Allow filtering by teacher, room, or class.

4. ### **Schedule Visualization**

5. ### **Export and Reporting**

Not sure about the reporting yet, but the schedules should be exportable for each section

* Export schedules in formats like PDF or Excel for sharing.  
* Provide analytics? Not sure about this one.

## **User Descriptions and Use cases**

###  **School Administrators**

* **Role**: Oversee scheduling, input data, resolve conflicts, and manage the system.  
* **Use Cases**:  
  1. Log in securely to the admin dashboard.  
  2. Input data:  
     * Add teachers, rooms, and classes.  
     * Define hard constraints (e.g., courses, departments, sections, teacher availability for courses, room capacities).  
  3. Run the scheduling engine to generate a draft timetable.  
  4. Review the generated schedule:  
     * See conflicts flagged by the system (whatever the system generates should be good. Manual adjustments might cause conflicts though).  
     * Use system-suggested fixes(maybe have it regenerate the entire thing?) or manually adjust schedules.  
  5. Finalize and export the schedule.  
  6. View metrics if we do analytics.

  ### **3.2. Teachers**

* **Role**: Provide input on preferences and view their schedules.  
* **Use Cases**:  
  1. Log in securely to the teacher portal.  
  2. Specify preferences:  
     * Working hours/days, or other teacher specific (soft) constraints.  
     * Room preferences or special accommodations.  
  3. View personalized schedules.  
  4. Submit feedback or flag conflicts for administrator review.

  ### **3.3. Students**

* **Role**: View finalized schedules.  
* **Use Cases**:  
  1. Log in (if permitted).  
  2. Access class schedules filtered by class group or subject.  
  3. Provide optional feedback on accessibility or conflicts.

## **4\. Options for the Scheduling Engine**

These are the options for which ML/AI tools or algorithms we can use for the actual scheduling. We need to decide which one we are going to use, along with a plan for it by the time we write the SDS (i’m assuming we have to lay out a plan for it in that doc). For the SRS, it should be fine, the only thing that matters is to narrow down *what we want the scheduler to do.*

## **Requirements**

– what i could come up with so far using the above description. Just a rough outline to get it started.

### **5.1. Functional Requirements**

1. **Data Input and Management**:  
   * Allow administrators to input teacher, room, and class data.  
   * Validate inputs to prevent missing or conflicting data.  
2. **Schedule Generation**:  
   * Generate schedules that meet all hard constraints.  
   * Optimize schedules for soft constraints.  
3. **Conflict Detection and Resolution**:  
   * Automatically identify scheduling conflicts.  
   * Provide actionable suggestions for resolution.  
4. **User Input and Preferences**:  
   * Allow teachers to specify working hours and preferences.  
   * Provide interfaces for feedback and manual adjustments.  
5. **Schedule Visualization**:  
   * Display schedules in grid or calendar formats.  
   * Enable filtering by teacher, room, or class.  
6. **Export**:  
   * Support exporting schedules in PDF and Excel formats.

   ### **5.2. Non-Functional Requirements**

1. **Performance**:  
   * Generate schedules for small-to-medium institutions within 2 minutes.  
2. **Scalability**:  
   * Handle increasing constraints and datasets efficiently.  
3. **Usability**:  
   * Ensure interfaces are intuitive and accessible for non-technical users.  
4. **Reliability**:  
   * Ensure data integrity and robust conflict detection.  
5. **Security**:  
   * Use role-based access control to secure sensitive data.

### **Milestones**

1. **Project Inception**  
* **Setup and Infrastructure**  
* Configure CI/CD pipelines, repository, linting rules, and version control.  
* Select and set up development tools and frameworks for frontend, backend, and database.  
* **Research and Planning**  
* Investigate scheduling algorithms (hard/soft constraints, optimization techniques).  
* Refine requirements and prioritize backlog items.

  ---

2. **Build Core Functionality**  
* **Backend Core**  
The backend core will be built using nest.js. It will make REST calls to the scheduling engine to run the scheduling/timetabling task. But that functionality is for later stages.
  * Implement user authentication (registration, login, RBAC).  
  * Develop logging and monitoring (basic telemetry for errors/performance).  
* **Frontend Core**  
  * Build shared screens: login, registration, dashboard navigation.  
* **Testing**  
  * Perform unit tests on authentication and core components.  
  * Validate frontend and backend integration.  
* **Deliverables:** Authenticated user flows, basic UI, monitoring, and logging in place.
  ---

3. **Basic Scheduling Engine**  
The scheduling engine should be a separate service, built in fastapi or django that handles just the scheduling part of the functionality.
* **Hard Constraints Engine**  
  * Implement core scheduling logic enforcing hard constraints.  
  * Develop input interfaces for teachers, rooms, and course data.  
* **UI for Scheduling**  
  * Create the scheduling dashboard for admins (functionality for inputting constraints, generating schedules).  
  * Build minimal teacher and student views for schedule display? No filtering at all.  
* **Testing**  
  * Validate engine outputs against hard constraints.  
  * Conduct basic system tests with sample data.  
* **Deliverables:** Functional hard-constraint scheduling engine with basic UI and constraint input.

  ---

4. **Soft Constraints and Optimization**   
* **Soft Constraints Integration**  
  * Integrate soft constraints into the scheduling engine (teacher preferences, room utilization).  
  * Test the scheduling engine for proper handling of soft constraints.  
* **Data Input**: Setup the soft constraint input mechanism for teachers.   
* **Preliminary Optimization** \- can remove this for this one  
  * Experiment with basic optimization techniques (e.g., heuristics).  
  * Conduct preliminary performance analysis with small datasets.  
* **Testing:** Validate the scheduling engine outputs with both soft and hard constraints.  
* **Deliverables:** Functional scheduling engine with soft constraints and initial optimization.

  ---

5. **Advanced Optimization and Visualization**   
   * **Optimization Refinement**  
     * Refine optimization techniques (e.g., ML models or advanced heuristics).  
     * Perform thorough performance tuning with larger datasets (maybe data from the school itself).  
   * **Visualization Features**  
     * Implement schedule visualization. Add filtering.  
     * Implement schedule exporting.  
     * Improve UI across the system.  
   * **End-to-End Testing**  
     * Conduct comprehensive tests for schedule generation and visualization.  
     * Validate system performance with larger datasets and simulation (could be school data or synthetic data)  
* **Deliverables:** Optimized scheduling engine and improved visualization and schedule export features.