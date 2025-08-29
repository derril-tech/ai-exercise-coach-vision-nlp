"""NLP intent parsing and command processing."""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger(__name__)


class IntentType(Enum):
    """Supported intent types."""
    PAUSE = "pause"
    RESUME = "resume"
    STOP = "stop"
    NEXT = "next"
    REPEAT = "repeat"
    EASIER = "easier"
    HARDER = "harder"
    FORM_CHECK = "form_check"
    REP_COUNT = "rep_count"
    HELP = "help"
    EXERCISE_SELECT = "exercise_select"
    UNKNOWN = "unknown"


@dataclass
class Intent:
    """Parsed intent from user input."""
    type: IntentType
    confidence: float
    entities: Dict[str, Any]
    original_text: str
    timestamp: float


@dataclass
class Entity:
    """Named entity extracted from text."""
    name: str
    value: str
    confidence: float
    start_pos: int
    end_pos: int


class IntentParser:
    """Rule-based intent parser for exercise commands."""
    
    def __init__(self):
        self.patterns = self._load_patterns()
        self.entities_patterns = self._load_entity_patterns()
        self.synonyms = self._load_synonyms()
        
    def _load_patterns(self) -> Dict[IntentType, List[str]]:
        """Load intent patterns."""
        return {
            IntentType.PAUSE: [
                r'\b(pause|stop|wait|hold)\b',
                r'\btake a (break|rest)\b',
                r'\bstop (for a moment|briefly)\b',
                r'\bhold on\b',
            ],
            IntentType.RESUME: [
                r'\b(resume|continue|start|go)\b',
                r'\blet\'s (continue|go|start)\b',
                r'\bkeep going\b',
                r'\bmove on\b',
            ],
            IntentType.STOP: [
                r'\b(stop|end|finish|quit|done)\b',
                r'\bthat\'s (enough|it)\b',
                r'\bi\'m (done|finished)\b',
                r'\bend (workout|session)\b',
            ],
            IntentType.NEXT: [
                r'\b(next|skip|move on)\b',
                r'\bnext (exercise|one)\b',
                r'\bskip (this|ahead)\b',
                r'\bmove to next\b',
            ],
            IntentType.REPEAT: [
                r'\b(repeat|again|redo)\b',
                r'\bdo (it|that) again\b',
                r'\bone more time\b',
                r'\brepeat (exercise|set)\b',
            ],
            IntentType.EASIER: [
                r'\b(easier|reduce|less|lower)\b',
                r'\bmake it easier\b',
                r'\btoo (hard|difficult)\b',
                r'\breduce (difficulty|intensity)\b',
                r'\bfewer reps\b',
            ],
            IntentType.HARDER: [
                r'\b(harder|increase|more|higher)\b',
                r'\bmake it harder\b',
                r'\btoo easy\b',
                r'\bincrease (difficulty|intensity)\b',
                r'\bmore reps\b',
            ],
            IntentType.FORM_CHECK: [
                r'\bhow (am i doing|is my form)\b',
                r'\bcheck my form\b',
                r'\bam i doing (this|it) (right|correctly)\b',
                r'\bform (feedback|check)\b',
                r'\bhow does it look\b',
            ],
            IntentType.REP_COUNT: [
                r'\bhow many (reps|repetitions)\b',
                r'\bwhat\'s my (count|rep count)\b',
                r'\bcount (reps|repetitions)\b',
                r'\bhow many have i done\b',
            ],
            IntentType.HELP: [
                r'\bhelp\b',
                r'\bwhat (can i say|commands)\b',
                r'\bvoice commands\b',
                r'\bwhat can you do\b',
            ],
            IntentType.EXERCISE_SELECT: [
                r'\blet\'s do (push.?ups?|squats?|lunges?|planks?)\b',
                r'\bstart (push.?ups?|squats?|lunges?|planks?)\b',
                r'\bi want to do (push.?ups?|squats?|lunges?|planks?)\b',
            ],
        }
    
    def _load_entity_patterns(self) -> Dict[str, List[str]]:
        """Load entity extraction patterns."""
        return {
            'exercise': [
                r'\b(push.?ups?|squats?|lunges?|planks?|jumping.?jacks?)\b',
            ],
            'number': [
                r'\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b',
            ],
            'duration': [
                r'\b(\d+)\s*(seconds?|minutes?|mins?|secs?)\b',
            ],
        }
    
    def _load_synonyms(self) -> Dict[str, List[str]]:
        """Load synonym mappings."""
        return {
            'exercise': {
                'push-ups': ['pushups', 'push ups', 'press ups'],
                'squats': ['squat'],
                'lunges': ['lunge'],
                'planks': ['plank', 'planking'],
                'jumping-jacks': ['jumping jacks', 'star jumps'],
            },
            'numbers': {
                '1': ['one'], '2': ['two'], '3': ['three'], '4': ['four'], '5': ['five'],
                '6': ['six'], '7': ['seven'], '8': ['eight'], '9': ['nine'], '10': ['ten'],
                '11': ['eleven'], '12': ['twelve'], '13': ['thirteen'], '14': ['fourteen'], '15': ['fifteen'],
                '16': ['sixteen'], '17': ['seventeen'], '18': ['eighteen'], '19': ['nineteen'], '20': ['twenty'],
            }
        }

    async def parse_intent(self, text: str, timestamp: float = 0) -> Intent:
        """Parse intent from text input."""
        try:
            # Normalize text
            normalized_text = await self._normalize_text(text)
            
            # Extract entities first
            entities = await self._extract_entities(normalized_text)
            
            # Match intent patterns
            intent_type, confidence = await self._match_intent(normalized_text)
            
            return Intent(
                type=intent_type,
                confidence=confidence,
                entities=entities,
                original_text=text,
                timestamp=timestamp
            )
            
        except Exception as e:
            logger.error(f"Error parsing intent: {e}")
            return Intent(
                type=IntentType.UNKNOWN,
                confidence=0.0,
                entities={},
                original_text=text,
                timestamp=timestamp
            )

    async def _normalize_text(self, text: str) -> str:
        """Normalize input text."""
        # Convert to lowercase
        text = text.lower().strip()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Expand contractions
        contractions = {
            "i'm": "i am",
            "let's": "let us",
            "that's": "that is",
            "what's": "what is",
            "how's": "how is",
            "can't": "cannot",
            "won't": "will not",
            "don't": "do not",
        }
        
        for contraction, expansion in contractions.items():
            text = text.replace(contraction, expansion)
        
        return text

    async def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract named entities from text."""
        entities = {}
        
        for entity_type, patterns in self.entities_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    entity_value = match.group(1) if match.groups() else match.group(0)
                    
                    # Normalize entity value
                    if entity_type == 'exercise':
                        entity_value = await self._normalize_exercise_name(entity_value)
                    elif entity_type == 'number':
                        entity_value = await self._normalize_number(entity_value)
                    
                    if entity_type not in entities:
                        entities[entity_type] = []
                    
                    entities[entity_type].append({
                        'value': entity_value,
                        'confidence': 0.9,  # High confidence for rule-based extraction
                        'start': match.start(),
                        'end': match.end(),
                        'text': match.group(0)
                    })
        
        return entities

    async def _normalize_exercise_name(self, exercise: str) -> str:
        """Normalize exercise names."""
        exercise = exercise.lower().strip()
        
        # Check synonyms
        for canonical, synonyms in self.synonyms['exercise'].items():
            if exercise in synonyms or exercise == canonical:
                return canonical
        
        # Handle common variations
        if 'push' in exercise:
            return 'push-ups'
        elif 'squat' in exercise:
            return 'squats'
        elif 'lunge' in exercise:
            return 'lunges'
        elif 'plank' in exercise:
            return 'planks'
        elif 'jump' in exercise:
            return 'jumping-jacks'
        
        return exercise

    async def _normalize_number(self, number: str) -> int:
        """Convert number words to integers."""
        number = number.lower().strip()
        
        # Check if already a digit
        if number.isdigit():
            return int(number)
        
        # Convert word numbers
        for digit, words in self.synonyms['numbers'].items():
            if number in words:
                return int(digit)
        
        # Handle special cases
        number_map = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
        }
        
        return number_map.get(number, 0)

    async def _match_intent(self, text: str) -> Tuple[IntentType, float]:
        """Match text against intent patterns."""
        best_intent = IntentType.UNKNOWN
        best_confidence = 0.0
        
        for intent_type, patterns in self.patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    # Calculate confidence based on match quality
                    match_length = len(match.group(0))
                    text_length = len(text)
                    confidence = min(0.95, 0.7 + (match_length / text_length) * 0.25)
                    
                    if confidence > best_confidence:
                        best_intent = intent_type
                        best_confidence = confidence
        
        return best_intent, best_confidence

    async def generate_response(self, intent: Intent, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate appropriate response for parsed intent."""
        context = context or {}
        
        responses = {
            IntentType.PAUSE: {
                'action': 'pause_session',
                'message': 'Pausing your workout. Say "resume" when you\'re ready to continue.',
                'tts': 'Workout paused. Say resume when ready.',
            },
            IntentType.RESUME: {
                'action': 'resume_session',
                'message': 'Resuming your workout. Let\'s keep going!',
                'tts': 'Resuming workout. Let\'s keep going!',
            },
            IntentType.STOP: {
                'action': 'end_session',
                'message': 'Ending your workout session. Great job today!',
                'tts': 'Ending workout. Great job today!',
            },
            IntentType.NEXT: {
                'action': 'next_exercise',
                'message': 'Moving to the next exercise.',
                'tts': 'Moving to next exercise.',
            },
            IntentType.REPEAT: {
                'action': 'repeat_exercise',
                'message': 'Repeating the current exercise.',
                'tts': 'Repeating current exercise.',
            },
            IntentType.EASIER: {
                'action': 'reduce_difficulty',
                'message': 'Reducing difficulty. You\'ve got this!',
                'tts': 'Making it easier. You\'ve got this!',
            },
            IntentType.HARDER: {
                'action': 'increase_difficulty',
                'message': 'Increasing difficulty. Challenge accepted!',
                'tts': 'Making it harder. Challenge accepted!',
            },
            IntentType.FORM_CHECK: {
                'action': 'provide_form_feedback',
                'message': 'Checking your form...',
                'tts': 'Let me check your form.',
            },
            IntentType.REP_COUNT: {
                'action': 'provide_rep_count',
                'message': f'You\'ve completed {context.get("rep_count", 0)} reps.',
                'tts': f'You have done {context.get("rep_count", 0)} reps.',
            },
            IntentType.HELP: {
                'action': 'show_help',
                'message': 'Available commands: pause, resume, next, easier, harder, form check, rep count.',
                'tts': 'You can say pause, resume, next, easier, harder, form check, or rep count.',
            },
            IntentType.EXERCISE_SELECT: {
                'action': 'select_exercise',
                'message': f'Starting {intent.entities.get("exercise", [{}])[0].get("value", "exercise")}.',
                'tts': f'Starting {intent.entities.get("exercise", [{}])[0].get("value", "exercise")}.',
            },
        }
        
        response = responses.get(intent.type, {
            'action': 'unknown_command',
            'message': 'I didn\'t understand that command. Say "help" for available commands.',
            'tts': 'I didn\'t understand. Say help for commands.',
        })
        
        # Add intent information
        response.update({
            'intent': intent.type.value,
            'confidence': intent.confidence,
            'entities': intent.entities,
            'timestamp': intent.timestamp,
        })
        
        return response

    def get_supported_commands(self) -> List[Dict[str, str]]:
        """Get list of supported voice commands."""
        return [
            {'command': 'pause', 'description': 'Pause the current workout'},
            {'command': 'resume', 'description': 'Resume the paused workout'},
            {'command': 'stop', 'description': 'End the workout session'},
            {'command': 'next', 'description': 'Move to the next exercise'},
            {'command': 'repeat', 'description': 'Repeat the current exercise'},
            {'command': 'easier', 'description': 'Reduce the difficulty'},
            {'command': 'harder', 'description': 'Increase the difficulty'},
            {'command': 'form check', 'description': 'Get form feedback'},
            {'command': 'rep count', 'description': 'Get current rep count'},
            {'command': 'help', 'description': 'Show available commands'},
        ]
