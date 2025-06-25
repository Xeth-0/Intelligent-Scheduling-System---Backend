# Intelligent Scheduling System (ISS)

An AI-powered platform that automatically generates optimized university timetables using advanced genetic algorithms and constraint satisfaction techniques.

>**This repository contains the backend code, the readme below focuses on the system architecture and design.**

>**For the frontend code, it can be found <a href='https://github.com/JohnnyPro/intelligent-scheduler-frontend'> here </a>**

## Problem & Solution

Traditional university scheduling relies on manual processes or simple rule-based systems that struggle with complex constraints. ISS solves this by:

- **Automated optimization** of course schedules considering multiple constraints simultaneously
- **Stakeholder satisfaction** by incorporating teacher preferences and student needs
- **Resource efficiency** through optimal room and time allocation
- **Accessibility compliance** ensuring wheelchair access and special accommodations

The system uses genetic algorithms instead of traditional approaches because they handle soft constraints naturally, provide bounded execution time, and scale well with increasing complexity.

## System Architecture

ISS uses a microservices architecture with three specialized services:

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Web Application]
        ADMIN[Admin Dashboard]
        TEACHER[Teacher Portal]
    end

    subgraph "Core Service (NestJS)"
        API[REST API Gateway]
        AUTH[Authentication]
        DATA[Data Management]
        ORCHESTRATOR[Service Orchestrator]
    end

    subgraph "Scheduling Service (FastAPI)"
        GA[Genetic Algorithm Engine]
        FITNESS[Fitness Evaluator]
        CONSTRAINTS[Constraint Validators]
    end

    subgraph "Data Processing Service (Python)"
        CSV[CSV Processor]
        VALIDATOR[Data Validator]
    end

    subgraph "Infrastructure"
        QUEUE[RabbitMQ]
        DB[(PostgreSQL)]
    end

    WEB --> API
    ADMIN --> API
    TEACHER --> API
    
    API --> AUTH
    API --> DATA
    API --> ORCHESTRATOR
    
    ORCHESTRATOR --> QUEUE
    QUEUE --> GA
    QUEUE --> CSV
    
    GA --> FITNESS
    FITNESS --> CONSTRAINTS
    
    DATA --> DB
    CSV --> QUEUE

    classDef core fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef scheduling fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef data fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef infra fill:#fff3e0,stroke:#f57c00,stroke-width:2px

    class API,AUTH,DATA,ORCHESTRATOR core
    class GA,FITNESS,CONSTRAINTS scheduling
    class CSV,VALIDATOR data
    class QUEUE,DB infra
```

### Service Responsibilities

**Core Service (NestJS)**

- API gateway and request routing
- User authentication and authorization
- Data management for all entities (courses, teachers, rooms, etc.)
- Service coordination and result aggregation

**Scheduling Service (FastAPI)**

- Genetic algorithm execution for timetable optimization
- Constraint validation and fitness evaluation
- Multi-objective optimization with real-time progress tracking

**Data Processing Service (Python)**

- CSV file processing and bulk data import
- Data validation and error reporting
- Format standardization

### Communication Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Core
    participant Queue as RabbitMQ
    participant Scheduler
    participant DataProcessor

    Note over Admin,DataProcessor: Data Import Flow
    Admin->>Core: Upload CSV Files
    Core->>Queue: Publish Data Processing Request
    Queue->>DataProcessor: Process & Validate Data
    DataProcessor->>Queue: Return Validation Results
    Queue->>Core: Deliver Results
    Core->>Admin: Import Complete

    Note over Admin,Scheduler: Schedule Generation Flow  
    Admin->>Core: Request Schedule Generation
    Core->>Queue: Publish Schedule Request
    Queue->>Scheduler: Execute Genetic Algorithm
    Scheduler->>Queue: Return Optimized Schedule
    Queue->>Core: Deliver Generated Schedule
    Core->>Admin: Schedule Ready
```

## Genetic Algorithm Design

The scheduling engine uses a custom genetic algorithm optimized for timetabling problems:

```mermaid
flowchart TD
    START([Initialize Population<br/>50 chromosomes]) --> EVAL[Evaluate Fitness<br/>Multi-objective scoring]
    
    EVAL --> CHECK{Termination<br/>Condition?}
    
    CHECK -->|Perfect Solution<br/>Found| PERFECT[Return Optimal<br/>Schedule]
    CHECK -->|Time Limit<br/>20 seconds| TIMEOUT[Return Best<br/>Solution]
    CHECK -->|Max Generations<br/>10,000| MAXGEN[Return Best<br/>Solution]
    CHECK -->|Continue| EVOLVE[Evolution Process]
    
    EVOLVE --> SELECT[Tournament Selection<br/>Size: 3]
    SELECT --> CROSS[Single-Point Crossover]
    CROSS --> MUTATE[Gene Mutation<br/>Rate: 10%]
    MUTATE --> ELITE[Preserve Elite<br/>Count: 2]
    ELITE --> NEWPOP[Create New Population]
    
    NEWPOP --> EVAL
    
    PERFECT --> END([Algorithm Complete])
    TIMEOUT --> END
    MAXGEN --> END

    classDef startEnd fill:#c8e6c9,stroke:#4caf50,stroke-width:2px
    classDef process fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    classDef evolution fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px

    class START,END startEnd
    class EVAL,PERFECT,TIMEOUT,MAXGEN process
    class CHECK decision
    class EVOLVE,SELECT,CROSS,MUTATE,ELITE,NEWPOP evolution
```

### Key Algorithm Features

**Population Structure**: Each chromosome represents a complete timetable with genes corresponding to individual course sessions.

**Fitness Evaluation**: Multi-objective scoring system that heavily penalizes hard constraint violations (1000x multiplier) while optimizing soft constraints through weighted penalties.

**Selection Strategy**: Tournament selection with elitism ensures both exploration and preservation of high-quality solutions.

**Mutation Strategy**: Adaptive mutation targeting room assignments, time slots, and days based on constraint types.

**Termination Conditions**: Algorithm stops when finding perfect solutions, reaching time limits, or exhausting generations.

### Penalty Optimization System

The system includes an advanced penalty optimization component that automatically tunes constraint penalty weights for optimal scheduling quality:

```mermaid
graph TD
    subgraph "Penalty Optimization Process"
        INIT[Initialize Search Space<br/>Soft constraint penalties]
        SAFETY[Apply Safety Constraints<br/>Hard penalties >> Soft penalties]
        EVAL[Evaluate Configuration<br/>Run GA trials]
        BAYES[Bayesian Optimization<br/>scikit-optimize]
        FALLBACK[Grid Search Fallback<br/>When Bayesian unavailable]
        APPLY[Apply Optimal Parameters<br/>Update penalty manager]
    end

    subgraph "Search Parameters"
        ROOM[Room Capacity Overflow<br/>1.0 - 50.0]
        TIME[Teacher Time Preference<br/>1.0 - 20.0]
        LOCATION[Teacher Room Preference<br/>1.0 - 15.0]
        MOVEMENT[Consecutive Movement<br/>1.0 - 25.0]
        ECTS[ECTS Priority<br/>1.0 - 10.0]
    end

    subgraph "Safety Bounds"
        SEPARATION[Hard-Soft Separation<br/>Min 100x difference]
        MAX_SOFT[Max Individual Penalty<br/>Bounded limit]
        MIN_VAL[Minimum Penalty<br/>≥ 0.1]
    end

    INIT --> SAFETY
    SAFETY --> EVAL
    EVAL --> BAYES
    BAYES --> APPLY
    BAYES -.-> FALLBACK
    FALLBACK --> APPLY

    ROOM --> INIT
    TIME --> INIT
    LOCATION --> INIT
    MOVEMENT --> INIT
    ECTS --> INIT

    SEPARATION --> SAFETY
    MAX_SOFT --> SAFETY
    MIN_VAL --> SAFETY

    classDef process fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    classDef parameter fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
    classDef safety fill:#ffcdd2,stroke:#d32f2f,stroke-width:2px

    class INIT,SAFETY,EVAL,BAYES,FALLBACK,APPLY process
    class ROOM,TIME,LOCATION,MOVEMENT,ECTS parameter
    class SEPARATION,MAX_SOFT,MIN_VAL safety
```

**Optimization Features**:

**Bayesian Optimization**: Uses Gaussian process models to efficiently explore the penalty parameter space with Expected Improvement acquisition function.

**Safety Constraints**: Maintains hard constraint dominance by ensuring hard penalties are always at least 100x larger than the maximum possible soft penalty total.

**Multi-Trial Evaluation**: Runs multiple GA trials for each parameter configuration to ensure statistical significance and minimize variance in results.

**Adaptive Fallback**: Automatically switches to grid search when scikit-optimize is unavailable, ensuring system robustness.

**Configuration Validation**: All parameter updates are validated against safety bounds before application to prevent invalid penalty configurations.

## Constraint System Architecture

The constraint system uses a sophisticated validator pattern to handle different types of scheduling requirements:

```mermaid
graph TB
    subgraph "Constraint Categories"
        HARD[Hard Constraints<br/>Must be satisfied]
        SOFT[Soft Constraints<br/>Preferences to optimize]
    end

    subgraph "Hard Constraint Types"
        MISSING[Missing Data<br/>Validation]
        CONFLICTS[Resource Conflicts<br/>Room/Teacher/Student]
        ROOM_TYPE[Room Type<br/>Matching]
        ACCESS[Wheelchair<br/>Accessibility]
        INVALID[Invalid<br/>Scheduling]
    end

    subgraph "Soft Constraint Types"
        TEACHER_PREF[Teacher<br/>Preferences]
        CAPACITY[Room Capacity<br/>Optimization]
        ECTS[Course Priority<br/>ECTS-based]
        MOVEMENT[Consecutive<br/>Movement]
        COMPACTNESS[Schedule<br/>Compactness]
    end

    subgraph "Validator Types"
        STATELESS[Stateless Validators<br/>Single gene evaluation]
        STATEFUL[Stateful Validators<br/>Conflict tracking]
        WHOLE[Whole Schedule<br/>Global analysis]
    end

    HARD --> MISSING
    HARD --> CONFLICTS
    HARD --> ROOM_TYPE
    HARD --> ACCESS
    HARD --> INVALID

    SOFT --> TEACHER_PREF
    SOFT --> CAPACITY
    SOFT --> ECTS
    SOFT --> MOVEMENT
    SOFT --> COMPACTNESS

    MISSING --> STATELESS
    ROOM_TYPE --> STATELESS
    ACCESS --> STATELESS
    
    CONFLICTS --> STATEFUL
    TEACHER_PREF --> STATELESS
    CAPACITY --> STATELESS
    
    MOVEMENT --> WHOLE
    COMPACTNESS --> WHOLE

    classDef hard fill:#ffcdd2,stroke:#d32f2f,stroke-width:2px
    classDef soft fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef validator fill:#e1f5fe,stroke:#0288d1,stroke-width:2px

    class HARD,MISSING,CONFLICTS,ROOM_TYPE,ACCESS,INVALID hard
    class SOFT,TEACHER_PREF,CAPACITY,ECTS,MOVEMENT,COMPACTNESS soft
    class STATELESS,STATEFUL,WHOLE validator
```

### Constraint Validation Strategy

**Stateless Validators**: Evaluate individual course assignments independently. Examples include room type matching and basic data validation.

**Stateful Validators**: Track resource usage across the schedule to detect conflicts. They build conflict maps during evaluation for efficient O(1) lookup.

**Whole Schedule Validators**: Analyze global patterns like teacher movement between consecutive classes or schedule compactness.

### Constraint Priority System

Hard constraints are treated as absolute requirements with binary violation detection. Soft constraints use priority-weighted scoring where:

- Teacher preferences include priority levels (1-10)
- Institutional policies have fixed priority weights
- User-defined constraints allow custom priority assignment

## Technology Stack

### Backend Services

- **Core Service**: NestJS + TypeScript + Prisma ORM + PostgreSQL
- **Scheduling Service**: FastAPI + Python + Pydantic + NumPy
- **Data Processing**: Python + pandas + RabbitMQ integration

### Infrastructure

- **Database**: PostgreSQL with automated migrations
- **Message Queue**: RabbitMQ for async communication
- **Containerization**: Docker + Docker Compose
- **Monitoring**: Sentry for error tracking

### Development Tools

- **Authentication**: JWT with role-based access control
- **API Documentation**: Swagger/OpenAPI auto-generation
- **Testing**: Jest (Node.js), pytest (Python)
- **Type Safety**: Full-stack TypeScript integration

## Key Design Decisions

### Microservices Architecture

Enables language specialization (Python for algorithms, TypeScript for APIs), independent scaling, and fault isolation. Scheduling failures don't impact user management.

### Genetic Algorithm Choice

Better handling of soft constraints compared to constraint programming, bounded execution time suitable for web applications, and natural multi-objective optimization.

### Message Queue Communication

Handles long-running genetic algorithm execution beyond HTTP timeouts, provides reliability through message persistence, and enables load balancing across multiple instances.

### Strategy Pattern for Constraints

Allows dynamic constraint addition without code modification, enables independent testing of constraint types, and supports database-driven constraint configuration.

## Getting Started

1. **Prerequisites**: Docker, Node.js 18+, Python 3.9+
2. **Infrastructure**: Start PostgreSQL and RabbitMQ with Docker Compose
3. **Core Service**: Install dependencies, run migrations, start NestJS server
4. **Scheduling Service**: Set up Python environment, install requirements, start FastAPI
5. **Data Processing**: Configure Python service for CSV processing

The system provides a complete web interface for administrators to manage data, configure constraints, and generate optimized schedules with real-time progress tracking.
