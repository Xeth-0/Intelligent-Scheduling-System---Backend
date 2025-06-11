from typing import List, Tuple

from .BaseConstraint import StatelessConstraintValidator, StatefulConstraintValidator, ConstraintContext
from app.services.FitnessReport import ConstraintViolation
from app.services.SchedulingConstraint import SchedulingConstraintCategory


class MissingDataConstraint(StatelessConstraintValidator):
    """Validates that all required data exists for a scheduled item."""
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.MISSING_DATA, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item

        if item is None: return violations
        
        # Check for missing course
        if not context.courses.get(item.courseId):
            violations.append(self._create_violation(
                context, f"Course {item.courseId} not found"
            ))
        
        # Check for missing room
        if not context.rooms.get(item.classroomId):
            violations.append(self._create_violation(
                context, f"Room {item.classroomId} not found"
            ))
        
        # Check for missing teacher
        if not context.teachers.get(item.teacherId):
            violations.append(self._create_violation(
                context, f"Teacher {item.teacherId} not found"
            ))
        
        return violations


class InvalidSchedulingConstraint(StatelessConstraintValidator):
    """Validates that scheduling data is valid."""
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.INVALID_SCHEDULING, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item

        if item is None: return violations
        
        if not item.timeslot or not item.day:
            violations.append(self._create_violation(
                context, "Missing timeslot or day assignment"
            ))
        
        return violations


class UnassignedRoomConstraint(StatelessConstraintValidator):
    """Validates that rooms are properly assigned."""
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.UNASSIGNED_ROOM, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item
        
        if item is None: return violations
        
        if not item.classroomId or not context.rooms.get(item.classroomId):
            violations.append(self._create_violation(
                context, "Unscheduled item"
            ))
        
        return violations


class RoomTypeMatchConstraint(StatelessConstraintValidator):
    """Validates that room type matches session type."""
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.ROOM_TYPE_MISMATCH, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item
        
        if item is None: return violations
        
        room = context.rooms.get(item.classroomId)
        
        if room and room.type != item.sessionType:
            violations.append(self._create_violation(
                context, 
                f"Session type '{item.sessionType}' requires different room type than '{room.type}'"
            ))
        
        return violations


class WheelchairAccessibilityConstraint(StatelessConstraintValidator):
    """Validates wheelchair accessibility requirements."""
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.TEACHER_WHEELCHAIR_ACCESS, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item
        
        if item is None: return violations
        
        room = context.rooms.get(item.classroomId)
        teacher = context.teachers.get(item.teacherId)
        
        if not room or not teacher:
            return violations
        
        # Teacher wheelchair access
        if teacher.needsWheelchairAccessibleRoom and not room.isWheelchairAccessible:
            violations.append(self._create_violation(
                context,
                f"Teacher {teacher.name} needs wheelchair accessible room, but {room.name} is not accessible"
            ))
        
        # Student group wheelchair access
        for sg_id in item.studentGroupIds:
            student_group = context.student_groups.get(sg_id)
            if student_group and student_group.accessibilityRequirement and not room.isWheelchairAccessible:
                violations.append(ConstraintViolation(
                    SchedulingConstraintCategory.STUDENT_GROUP_WHEELCHAIR_ACCESS,
                    self.constraint_type,
                    self.penalty_manager.get_penalty(SchedulingConstraintCategory.STUDENT_GROUP_WHEELCHAIR_ACCESS),
                    item,
                    f"Student group {student_group.name} needs wheelchair accessible room, but {room.name} is not accessible"
                ))
        
        return violations


class RoomConflictConstraint(StatefulConstraintValidator):
    """
    Validates room conflicts - this is stateful because it needs to track
    what rooms are already occupied and update the tracker.
    """
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.ROOM_CONFLICT, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item
        
        if item is None: return violations
        
        room = context.rooms.get(item.classroomId)
        
        if not room:
            return violations
        
        # Create time key for conflict detection
        time_key = (item.classroomId, item.day, item.timeslot)
        
        # Check if room is already occupied
        if time_key in context.room_tracker:
            conflicting_item = context.room_tracker[time_key]
            violations.append(self._create_violation(
                context,
                f"Room {room.name} already occupied at {item.day} {item.timeslot}",
                conflicting_item=conflicting_item
            ))
        else:
            # Update tracker with current item
            context.room_tracker[time_key] = item
        
        return violations


class TeacherConflictConstraint(StatefulConstraintValidator):
    """Validates teacher conflicts."""
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.TEACHER_CONFLICT, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item
        
        if item is None: return violations
        
        teacher = context.teachers.get(item.teacherId)
        
        if not teacher:
            return violations
        
        time_key = (item.teacherId, item.day, item.timeslot)
        
        if time_key in context.teacher_tracker:
            conflicting_item = context.teacher_tracker[time_key]
            violations.append(self._create_violation(
                context,
                f"Teacher {teacher.name} already teaching at {item.day} {item.timeslot}",
                conflicting_item=conflicting_item
            ))
        else:
            context.teacher_tracker[time_key] = item
        
        return violations


class StudentGroupConflictConstraint(StatefulConstraintValidator):
    """Validates student group conflicts."""
    
    def __init__(self, penalty_manager):
        super().__init__(SchedulingConstraintCategory.STUDENT_GROUP_CONFLICT, penalty_manager)
    
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item
        
        if item is None: return violations
        
        for sg_id in item.studentGroupIds:
            time_key = (sg_id, item.day, item.timeslot)
            
            if time_key in context.student_group_tracker:
                conflicting_item = context.student_group_tracker[time_key]
                student_group = context.student_groups.get(sg_id)
                sg_name = student_group.name if student_group else sg_id
                
                violations.append(self._create_violation(
                    context,
                    f"Student group {sg_name} already has class at {item.day} {item.timeslot}",
                    conflicting_item=conflicting_item
                ))
            else:
                context.student_group_tracker[time_key] = item
        
        return violations 