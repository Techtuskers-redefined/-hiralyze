import os
import asyncio
from typing import Dict, List, Any
import google.generativeai as genai
from groq import Groq
import json
import re

class AIProcessor:
    def __init__(self):
        # Initialize GROQ client
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Initialize GEMINI
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.gemini_model = genai.GenerativeModel('gemini-pro')
        
        # Skill categories for analysis
        self.skill_categories = {
            'technical': ['programming', 'software', 'development', 'coding', 'database', 'cloud', 'devops'],
            'soft': ['communication', 'leadership', 'teamwork', 'problem-solving', 'analytical', 'creative'],
            'domain': ['finance', 'healthcare', 'education', 'marketing', 'sales', 'hr', 'legal']
        }

    async def analyze_resume(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze resume using GROQ + GEMINI"""
        try:
            # Calculate base score
            base_score = self._calculate_base_score(parsed_data)
            
            # Get AI analysis from GROQ
            groq_analysis = await self._get_groq_analysis(parsed_data)
            
            # Get additional insights from GEMINI
            gemini_insights = await self._get_gemini_insights(parsed_data)
            
            # Combine analyses
            final_analysis = self._combine_analyses(groq_analysis, gemini_insights)
            
            # Adjust score based on AI analysis
            final_score = self._adjust_score_with_ai(base_score, final_analysis)
            
            return {
                "score": final_score,
                "analysis": final_analysis
            }
        
        except Exception as e:
            print(f"AI analysis error: {str(e)}")
            # Fallback to basic analysis
            return {
                "score": self._calculate_base_score(parsed_data),
                "analysis": self._get_fallback_analysis(parsed_data)
            }

    async def _get_groq_analysis(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get analysis from GROQ API"""
        try:
            # Prepare prompt for GROQ
            prompt = self._create_analysis_prompt(parsed_data)
            
            # Call GROQ API
            response = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are an expert resume analyzer. Provide detailed analysis in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                model="mixtral-8x7b-32768",
                temperature=0.3,
                max_tokens=2000
            )
            
            # Parse response
            analysis_text = response.choices[0].message.content
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                analysis = self._parse_text_analysis(analysis_text)
            
            return analysis
        
        except Exception as e:
            print(f"GROQ analysis error: {str(e)}")
            return self._get_fallback_analysis(parsed_data)

    async def _get_gemini_insights(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get insights from GEMINI API"""
        try:
            # Prepare prompt for GEMINI
            prompt = f"""
            Analyze this resume data and provide insights about the candidate's experience level, 
            career progression, and skill development. Focus on:
            1. Experience level assessment
            2. Career growth trajectory
            3. Skill diversity and depth
            4. Industry expertise
            
            Resume data: {json.dumps(parsed_data, indent=2)}
            
            Provide response in JSON format with keys: experience_level, career_progression, skill_assessment, industry_expertise
            """
            
            response = self.gemini_model.generate_content(prompt)
            
            # Parse response
            response_text = response.text
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if json_match:
                insights = json.loads(json_match.group())
            else:
                insights = self._parse_gemini_text(response_text)
            
            return insights
        
        except Exception as e:
            print(f"GEMINI insights error: {str(e)}")
            return {
                "experience_level": self._determine_experience_level(parsed_data),
                "career_progression": "Unable to analyze",
                "skill_assessment": "Standard skill set",
                "industry_expertise": "General"
            }

    def _create_analysis_prompt(self, parsed_data: Dict[str, Any]) -> str:
        """Create analysis prompt for AI"""
        return f"""
        Analyze this resume and provide a comprehensive assessment. Return your analysis in JSON format with the following structure:
        {{
            "strengths": ["list of key strengths"],
            "weaknesses": ["list of areas for improvement"],
            "recommendations": ["list of recommendations"],
            "skills_match": [{{"skill": "skill_name", "confidence": 0.0-1.0}}],
            "experience_level": "entry|mid|senior|executive",
            "technical_depth": "basic|intermediate|advanced|expert",
            "leadership_potential": "low|medium|high",
            "adaptability_score": 0-100
        }}
        
        Resume Data:
        Personal Info: {parsed_data.get('personal_info', {})}
        Skills: {parsed_data.get('skills', [])}
        Experience: {parsed_data.get('experience', [])}
        Education: {parsed_data.get('education', [])}
        Certifications: {parsed_data.get('certifications', [])}
        Projects: {parsed_data.get('projects', [])}
        """

    def _combine_analyses(self, groq_analysis: Dict, gemini_insights: Dict) -> Dict[str, Any]:
        """Combine GROQ and GEMINI analyses"""
        combined = {
            "strengths": groq_analysis.get("strengths", []),
            "weaknesses": groq_analysis.get("weaknesses", []),
            "recommendations": groq_analysis.get("recommendations", []),
            "skills_match": groq_analysis.get("skills_match", []),
            "experience_level": groq_analysis.get("experience_level", gemini_insights.get("experience_level", "mid")),
            "technical_depth": groq_analysis.get("technical_depth", "intermediate"),
            "leadership_potential": groq_analysis.get("leadership_potential", "medium"),
            "adaptability_score": groq_analysis.get("adaptability_score", 70),
            "career_progression": gemini_insights.get("career_progression", "Steady growth"),
            "skill_assessment": gemini_insights.get("skill_assessment", "Well-rounded"),
            "industry_expertise": gemini_insights.get("industry_expertise", "Technology")
        }
        
        return combined

    def _calculate_base_score(self, parsed_data: Dict[str, Any]) -> int:
        """Calculate base score from parsed data"""
        score = 0
        
        # Skills scoring (30 points max)
        skills = parsed_data.get('skills', [])
        skills_score = min(30, len(skills) * 2)
        score += skills_score
        
        # Experience scoring (40 points max)
        experience = parsed_data.get('experience', [])
        total_experience = sum(exp.get('duration', 0) for exp in experience)
        experience_score = min(40, total_experience * 8)
        score += experience_score
        
        # Education scoring (20 points max)
        education = parsed_data.get('education', [])
        if education:
            education_score = 20
            # Bonus for advanced degrees
            for edu in education:
                degree = edu.get('degree', '').lower()
                if 'master' in degree or 'phd' in degree or 'doctorate' in degree:
                    education_score = min(25, education_score + 5)
                    break
        else:
            education_score = 0
        score += education_score
        
        # Certifications scoring (10 points max)
        certifications = parsed_data.get('certifications', [])
        cert_score = min(10, len(certifications) * 3)
        score += cert_score
        
        return min(100, score)

    def _adjust_score_with_ai(self, base_score: int, analysis: Dict[str, Any]) -> int:
        """Adjust score based on AI analysis"""
        adjusted_score = base_score
        
        # Adjust based on experience level
        experience_level = analysis.get('experience_level', 'mid')
        if experience_level == 'senior':
            adjusted_score += 5
        elif experience_level == 'executive':
            adjusted_score += 10
        elif experience_level == 'entry':
            adjusted_score -= 5
        
        # Adjust based on technical depth
        technical_depth = analysis.get('technical_depth', 'intermediate')
        if technical_depth == 'expert':
            adjusted_score += 8
        elif technical_depth == 'advanced':
            adjusted_score += 5
        elif technical_depth == 'basic':
            adjusted_score -= 3
        
        # Adjust based on leadership potential
        leadership = analysis.get('leadership_potential', 'medium')
        if leadership == 'high':
            adjusted_score += 5
        elif leadership == 'low':
            adjusted_score -= 2
        
        # Adjust based on adaptability
        adaptability = analysis.get('adaptability_score', 70)
        if adaptability > 80:
            adjusted_score += 3
        elif adaptability < 50:
            adjusted_score -= 3
        
        return max(0, min(100, adjusted_score))

    def _determine_experience_level(self, parsed_data: Dict[str, Any]) -> str:
        """Determine experience level from parsed data"""
        experience = parsed_data.get('experience', [])
        total_years = sum(exp.get('duration', 0) for exp in experience)
        
        if total_years < 2:
            return 'entry'
        elif total_years < 5:
            return 'mid'
        elif total_years < 10:
            return 'senior'
        else:
            return 'executive'

    def _get_fallback_analysis(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Provide fallback analysis when AI fails"""
        skills = parsed_data.get('skills', [])
        experience = parsed_data.get('experience', [])
        
        return {
            "strengths": [
                f"Proficient in {len(skills)} technical skills" if skills else "Diverse background",
                f"{len(experience)} years of professional experience" if experience else "Educational foundation",
                "Strong educational background" if parsed_data.get('education') else "Practical experience"
            ],
            "weaknesses": [
                "Limited skill diversity" if len(skills) < 5 else "Could expand soft skills",
                "Early career stage" if len(experience) < 2 else "Could benefit from leadership experience"
            ],
            "recommendations": [
                "Continue developing technical skills",
                "Gain more hands-on experience",
                "Consider additional certifications"
            ],
            "skills_match": [{"skill": skill, "confidence": 0.7} for skill in skills[:10]],
            "experience_level": self._determine_experience_level(parsed_data),
            "technical_depth": "intermediate",
            "leadership_potential": "medium",
            "adaptability_score": 70
        }

    def _parse_text_analysis(self, text: str) -> Dict[str, Any]:
        """Parse analysis from text when JSON parsing fails"""
        analysis = {
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "skills_match": [],
            "experience_level": "mid",
            "technical_depth": "intermediate",
            "leadership_potential": "medium",
            "adaptability_score": 70
        }
        
        # Extract strengths
        strengths_match = re.search(r'strengths?:?\s*(.+?)(?=weaknesses?|$)', text, re.IGNORECASE | re.DOTALL)
        if strengths_match:
            strengths_text = strengths_match.group(1)
            analysis["strengths"] = [s.strip() for s in re.split(r'[•\-\n]', strengths_text) if s.strip()]
        
        # Extract weaknesses
        weaknesses_match = re.search(r'weaknesses?:?\s*(.+?)(?=recommendations?|$)', text, re.IGNORECASE | re.DOTALL)
        if weaknesses_match:
            weaknesses_text = weaknesses_match.group(1)
            analysis["weaknesses"] = [w.strip() for w in re.split(r'[•\-\n]', weaknesses_text) if w.strip()]
        
        return analysis

    def _parse_gemini_text(self, text: str) -> Dict[str, Any]:
        """Parse GEMINI response when JSON parsing fails"""
        insights = {
            "experience_level": "mid",
            "career_progression": "Steady growth",
            "skill_assessment": "Well-rounded",
            "industry_expertise": "Technology"
        }
        
        # Extract experience level
        if 'senior' in text.lower():
            insights["experience_level"] = "senior"
        elif 'entry' in text.lower() or 'junior' in text.lower():
            insights["experience_level"] = "entry"
        elif 'executive' in text.lower():
            insights["experience_level"] = "executive"
        
        return insights

    async def analyze_skills(self, skills: List[str]) -> Dict[str, Any]:
        """Analyze and categorize skills"""
        try:
            categorized_skills = {
                'technical': [],
                'soft': [],
                'domain': [],
                'other': []
            }
            
            for skill in skills:
                skill_lower = skill.lower()
                categorized = False
                
                for category, keywords in self.skill_categories.items():
                    if any(keyword in skill_lower for keyword in keywords):
                        categorized_skills[category].append(skill)
                        categorized = True
                        break
                
                if not categorized:
                    categorized_skills['other'].append(skill)
            
            return {
                'categorized_skills': categorized_skills,
                'total_skills': len(skills),
                'technical_ratio': len(categorized_skills['technical']) / len(skills) if skills else 0,
                'diversity_score': len([cat for cat in categorized_skills.values() if cat]) * 25
            }
        
        except Exception as e:
            print(f"Skills analysis error: {str(e)}")
            return {
                'categorized_skills': {'technical': skills, 'soft': [], 'domain': [], 'other': []},
                'total_skills': len(skills),
                'technical_ratio': 1.0,
                'diversity_score': 50
            }

    async def generate_interview_questions(self, job_data: Dict[str, Any], candidate_data: Dict[str, Any]) -> List[str]:
        """Generate interview questions based on job and candidate"""
        try:
            prompt = f"""
            Generate 10 relevant interview questions for this candidate and job position.
            
            Job: {job_data.get('title', 'Software Engineer')}
            Company: {job_data.get('company', 'Tech Company')}
            Requirements: {job_data.get('requirements', [])}
            
            Candidate Skills: {candidate_data.get('skills', [])}
            Experience: {candidate_data.get('experience', [])}
            
            Generate a mix of:
            - Technical questions (40%)
            - Behavioral questions (30%)
            - Situational questions (20%)
            - Company/role specific questions (10%)
            
            Return as a simple list of questions.
            """
            
            response = self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are an expert interviewer. Generate relevant, insightful interview questions."},
                    {"role": "user", "content": prompt}
                ],
                model="mixtral-8x7b-32768",
                temperature=0.7,
                max_tokens=1500
            )
            
            questions_text = response.choices[0].message.content
            
            # Extract questions from response
            questions = []
            for line in questions_text.split('\n'):
                line = line.strip()
                if line and ('?' in line or line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'))):
                    # Clean up question
                    question = re.sub(r'^\d+\.?\s*', '', line)
                    if question:
                        questions.append(question)
            
            return questions[:10]  # Return max 10 questions
        
        except Exception as e:
            print(f"Question generation error: {str(e)}")
            # Fallback questions
            return [
                "Tell me about your experience with the technologies mentioned in your resume.",
                "Describe a challenging project you worked on and how you overcame obstacles.",
                "How do you stay updated with the latest industry trends and technologies?",
                "Tell me about a time when you had to work with a difficult team member.",
                "How do you approach problem-solving in your development process?",
                "What interests you most about this role and our company?",
                "Describe your experience with agile development methodologies.",
                "How do you handle tight deadlines and multiple priorities?",
                "Tell me about a time when you had to learn a new technology quickly.",
                "Where do you see yourself in your career in the next 3-5 years?"
            ]