import os
import json
import re
from typing import Dict, List, Any
import google.generativeai as genai
from groq import Groq

class ChatbotService:
    def __init__(self):
        # Initialize GROQ client
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Initialize GEMINI
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.gemini_model = genai.GenerativeModel('gemini-pro')
        
        # Intent patterns
        self.intent_patterns = {
            'application_inquiry': [
                'application', 'apply', 'job application', 'status', 'applied'
            ],
            'interview_inquiry': [
                'interview', 'schedule', 'meeting', 'appointment', 'interview time'
            ],
            'resume_inquiry': [
                'resume', 'cv', 'upload', 'document', 'profile'
            ],
            'job_inquiry': [
                'job', 'position', 'role', 'opening', 'vacancy', 'career'
            ],
            'score_inquiry': [
                'score', 'rating', 'match', 'percentage', 'evaluation'
            ],
            'help_request': [
                'help', 'how', 'what', 'guide', 'tutorial', 'assistance'
            ],
            'greeting': [
                'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'
            ],
            'goodbye': [
                'bye', 'goodbye', 'see you', 'farewell', 'thanks', 'thank you'
            ]
        }
        
        # Response templates
        self.response_templates = {
            'candidate': {
                'application_inquiry': [
                    "I can help you with your job applications! You can view your application status in the Applications section. Would you like me to guide you through applying for a specific job?",
                    "Let me help you track your applications. You can see all your submitted applications and their current status in your dashboard.",
                    "I can assist with application-related questions. What specific information do you need about your applications?"
                ],
                'interview_inquiry': [
                    "I can help you with interview scheduling! You can view your upcoming interviews in the dashboard. Need help preparing for an interview?",
                    "Let me assist with your interviews. You can see scheduled interviews and get preparation tips. What would you like to know?",
                    "I'm here to help with interview-related questions. Would you like tips on interview preparation or information about scheduling?"
                ],
                'resume_inquiry': [
                    "I can help you with your resume! Upload your resume in PDF, DOC, or DOCX format for AI analysis and job matching.",
                    "Let me guide you through resume management. Our AI analyzes your resume to provide match scores for jobs. Need help uploading?",
                    "I can assist with resume-related questions. Would you like help uploading your resume or understanding your AI score?"
                ],
                'job_inquiry': [
                    "I can help you find jobs! Browse available positions, filter by location and type, and see AI match scores for each role.",
                    "Let me help you explore job opportunities. You can search jobs by keywords, location, and see how well you match each position.",
                    "I can assist with job searching. Would you like help finding positions that match your skills and experience?"
                ]
            },
            'hr': {
                'application_inquiry': [
                    "I can help you manage candidate applications! View all applications, filter by status, and update candidate progress in the HR dashboard.",
                    "Let me assist with application management. You can review candidates, update statuses, and track the hiring pipeline.",
                    "I can help with candidate applications. Would you like guidance on reviewing applications or updating candidate statuses?"
                ],
                'interview_inquiry': [
                    "I can help you schedule and manage interviews! Use the Interview Scheduling section to book appointments and track feedback.",
                    "Let me assist with interview management. You can schedule interviews, send reminders, and collect feedback from interviewers.",
                    "I can help with interview scheduling. Would you like guidance on booking interviews or managing the interview process?"
                ],
                'resume_inquiry': [
                    "I can help you review candidate resumes! View AI-parsed data, scores, and detailed analysis for each candidate.",
                    "Let me assist with resume analysis. You can see AI scores, skill matches, and detailed candidate profiles.",
                    "I can help with candidate resume review. Would you like guidance on interpreting AI scores or candidate analysis?"
                ],
                'job_inquiry': [
                    "I can help you manage job postings! Create new listings, edit existing ones, and track applications in the Jobs section.",
                    "Let me assist with job management. You can post new positions, update requirements, and monitor application metrics.",
                    "I can help with job posting management. Would you like guidance on creating job listings or tracking applications?"
                ]
            }
        }

    async def process_message(self, message: str, conversation_history: List[Dict[str, str]], 
                            user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process chat message using GROQ + GEMINI"""
        try:
            # Detect intent
            intent = self._detect_intent(message)
            
            # Get context-aware response
            if intent in ['greeting', 'goodbye', 'help_request'] or len(conversation_history) < 2:
                # Use template responses for simple intents
                response = self._get_template_response(intent, user_role, message)
                confidence = 0.9
            else:
                # Use AI for complex queries
                response = await self._get_ai_response(message, conversation_history, user_role, context, intent)
                confidence = 0.8
            
            # Extract entities
            entities = self._extract_entities(message)
            
            # Update context
            updated_context = self._update_context(context, intent, entities)
            
            return {
                'response': response,
                'intent': intent,
                'confidence': confidence,
                'entities': entities,
                'updated_context': updated_context
            }
        
        except Exception as e:
            print(f"Chatbot processing error: {str(e)}")
            return {
                'response': "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                'intent': 'error',
                'confidence': 0.0,
                'entities': [],
                'updated_context': context
            }

    def _detect_intent(self, message: str) -> str:
        """Detect user intent from message"""
        message_lower = message.lower()
        
        # Check each intent pattern
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if pattern in message_lower:
                    return intent
        
        return 'general'

    def _get_template_response(self, intent: str, user_role: str, message: str) -> str:
        """Get template response for simple intents"""
        if intent == 'greeting':
            return f"Hello! I'm your AI assistant for the resume screening platform. How can I help you today?"
        
        elif intent == 'goodbye':
            return "Thank you for using our platform! Feel free to ask if you need any help in the future."
        
        elif intent == 'help_request':
            if user_role == 'candidate':
                return """I'm here to help! As a candidate, you can:
• Upload and manage your resume
• Browse and apply for jobs
• Track your application status
• View scheduled interviews
• Update your profile

What specific area would you like help with?"""
            else:
                return """I'm here to help! As an HR user, you can:
• Manage candidate applications
• Schedule and track interviews
• Create and manage job postings
• View analytics and reports
• Review candidate profiles and resumes

What would you like assistance with?"""
        
        elif intent in self.response_templates.get(user_role, {}):
            templates = self.response_templates[user_role][intent]
            return templates[0]  # Return first template
        
        else:
            return "I'm your AI assistant for the resume screening platform. I can help you with applications, interviews, job postings, and more. What would you like to know?"

    async def _get_ai_response(self, message: str, conversation_history: List[Dict[str, str]], 
                              user_role: str, context: Dict[str, Any], intent: str) -> str:
        """Get AI-generated response using GROQ + GEMINI"""
        try:
            # Prepare conversation context
            conversation_context = self._prepare_conversation_context(conversation_history, user_role, context)
            
            # Create prompt for AI
            prompt = f"""
            You are an AI assistant for a resume screening platform. 
            User role: {user_role}
            Detected intent: {intent}
            Context: {json.dumps(context)}
            
            Conversation history:
            {conversation_context}
            
            Current message: {message}
            
            Provide a helpful, accurate response about the resume screening platform. 
            Keep responses concise and actionable. If the user needs to perform an action,
            guide them to the appropriate section of the platform.
            """
            
            # Try GROQ first
            try:
                response = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant for a resume screening platform."},
                        {"role": "user", "content": prompt}
                    ],
                    model="mixtral-8x7b-32768",
                    temperature=0.7,
                    max_tokens=500
                )
                
                return response.choices[0].message.content.strip()
            
            except Exception as groq_error:
                print(f"GROQ error: {groq_error}")
                
                # Fallback to GEMINI
                response = self.gemini_model.generate_content(prompt)
                return response.text.strip()
        
        except Exception as e:
            print(f"AI response error: {str(e)}")
            return self._get_template_response(intent, user_role, message)

    def _prepare_conversation_context(self, conversation_history: List[Dict[str, str]], 
                                    user_role: str, context: Dict[str, Any]) -> str:
        """Prepare conversation context for AI"""
        context_lines = []
        
        # Add recent conversation history (last 6 messages)
        recent_history = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
        
        for msg in recent_history:
            role = "User" if msg.get('role') == 'user' else "Assistant"
            content = msg.get('content', '')
            context_lines.append(f"{role}: {content}")
        
        return '\n'.join(context_lines)

    def _extract_entities(self, message: str) -> List[Dict[str, Any]]:
        """Extract entities from message"""
        entities = []
        
        # Extract job titles
        job_patterns = [
            r'\b(software engineer|developer|manager|analyst|designer|architect)\b',
            r'\b(frontend|backend|full.?stack|devops|data scientist)\b'
        ]
        
        for pattern in job_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': 'job_title',
                    'value': match,
                    'confidence': 0.8
                })
        
        # Extract skills
        skill_patterns = [
            r'\b(python|java|javascript|react|node\.?js|aws|docker)\b'
        ]
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': 'skill',
                    'value': match,
                    'confidence': 0.9
                })
        
        # Extract numbers (could be scores, years, etc.)
        number_matches = re.findall(r'\b(\d+)\b', message)
        for match in number_matches:
            entities.append({
                'type': 'number',
                'value': int(match),
                'confidence': 0.7
            })
        
        return entities

    def _update_context(self, context: Dict[str, Any], intent: str, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Update conversation context"""
        updated_context = context.copy()
        
        # Update last intent
        updated_context['last_intent'] = intent
        
        # Update topic based on intent
        if intent != 'general':
            updated_context['current_topic'] = intent.split('_')[0]
        
        # Add entities to context
        if entities:
            if 'entities' not in updated_context:
                updated_context['entities'] = []
            
            # Add new entities (keep last 10)
            updated_context['entities'].extend(entities)
            updated_context['entities'] = updated_context['entities'][-10:]
        
        # Track conversation flow
        if 'conversation_flow' not in updated_context:
            updated_context['conversation_flow'] = []
        
        updated_context['conversation_flow'].append(intent)
        updated_context['conversation_flow'] = updated_context['conversation_flow'][-5:]  # Keep last 5 intents
        
        return updated_context