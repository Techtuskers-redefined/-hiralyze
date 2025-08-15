import asyncio
from typing import Dict, List, Any
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

class JobMatcher:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=1000,
            ngram_range=(1, 2)
        )
        
        # Skill importance weights
        self.skill_weights = {
            'programming': 1.5,
            'framework': 1.3,
            'database': 1.2,
            'cloud': 1.4,
            'soft_skill': 0.8,
            'tool': 1.0
        }
        
        # Experience level mappings
        self.experience_levels = {
            'entry': 0,
            'junior': 1,
            'mid': 2,
            'senior': 3,
            'lead': 4,
            'principal': 5,
            'executive': 6
        }

    async def calculate_match(self, resume_data: Dict[str, Any], job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate job match score using multiple factors"""
        try:
            # Extract relevant data
            resume_skills = resume_data.get('skills', [])
            resume_experience = resume_data.get('experience', [])
            resume_education = resume_data.get('education', [])
            
            job_requirements = job_data.get('requirements', [])
            job_title = job_data.get('title', '')
            job_description = job_data.get('description', '')
            job_skills = job_data.get('skills', [])
            
            # Calculate different match components
            skills_match = self._calculate_skills_match(resume_skills, job_requirements + job_skills)
            experience_match = self._calculate_experience_match(resume_experience, job_data)
            education_match = self._calculate_education_match(resume_education, job_data)
            semantic_match = await self._calculate_semantic_match(resume_data, job_data)
            
            # Weighted final score
            final_score = (
                skills_match['score'] * 0.4 +
                experience_match['score'] * 0.3 +
                semantic_match['score'] * 0.2 +
                education_match['score'] * 0.1
            )
            
            # Determine recommendation
            recommendation = self._get_recommendation(final_score, skills_match, experience_match)
            
            return {
                'score': round(final_score),
                'recommendation': recommendation,
                'breakdown': {
                    'skills_match': skills_match,
                    'experience_match': experience_match,
                    'education_match': education_match,
                    'semantic_match': semantic_match
                },
                'matching_skills': skills_match.get('matching_skills', []),
                'missing_skills': skills_match.get('missing_skills', []),
                'experience_gap': experience_match.get('gap_analysis', ''),
                'recommendations': self._generate_recommendations(skills_match, experience_match)
            }
        
        except Exception as e:
            print(f"Job matching error: {str(e)}")
            return {
                'score': 50,
                'recommendation': 'maybe',
                'breakdown': {},
                'matching_skills': [],
                'missing_skills': [],
                'experience_gap': '',
                'recommendations': []
            }

    def _calculate_skills_match(self, resume_skills: List[str], job_requirements: List[str]) -> Dict[str, Any]:
        """Calculate skills match score"""
        if not resume_skills or not job_requirements:
            return {'score': 0, 'matching_skills': [], 'missing_skills': job_requirements}
        
        # Normalize skills for comparison
        resume_skills_lower = [skill.lower().strip() for skill in resume_skills]
        job_requirements_lower = [req.lower().strip() for req in job_requirements]
        
        matching_skills = []
        missing_skills = []
        
        for requirement in job_requirements:
            requirement_lower = requirement.lower().strip()
            
            # Check for exact matches
            if requirement_lower in resume_skills_lower:
                matching_skills.append(requirement)
            else:
                # Check for partial matches
                partial_match = False
                for resume_skill in resume_skills_lower:
                    if (requirement_lower in resume_skill or 
                        resume_skill in requirement_lower or
                        self._are_similar_skills(requirement_lower, resume_skill)):
                        matching_skills.append(requirement)
                        partial_match = True
                        break
                
                if not partial_match:
                    missing_skills.append(requirement)
        
        # Calculate score
        if job_requirements:
            base_score = (len(matching_skills) / len(job_requirements)) * 100
        else:
            base_score = 50
        
        # Apply skill importance weights
        weighted_score = self._apply_skill_weights(matching_skills, base_score)
        
        return {
            'score': min(100, weighted_score),
            'matching_skills': matching_skills,
            'missing_skills': missing_skills,
            'match_ratio': len(matching_skills) / len(job_requirements) if job_requirements else 0
        }

    def _calculate_experience_match(self, resume_experience: List[Dict], job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate experience match score"""
        if not resume_experience:
            return {'score': 0, 'gap_analysis': 'No experience data available'}
        
        # Calculate total years of experience
        total_years = sum(exp.get('duration', 0) for exp in resume_experience)
        
        # Determine required experience from job
        job_title = job_data.get('title', '').lower()
        job_description = job_data.get('description', '').lower()
        
        required_years = self._extract_required_experience(job_title, job_description)
        
        # Calculate experience level match
        resume_level = self._determine_experience_level(total_years)
        required_level = self._extract_required_level(job_title, job_description)
        
        # Score based on experience alignment
        if total_years >= required_years:
            years_score = 100
        elif total_years >= required_years * 0.8:
            years_score = 80
        elif total_years >= required_years * 0.6:
            years_score = 60
        else:
            years_score = max(20, (total_years / required_years) * 60)
        
        # Level alignment score
        level_score = self._calculate_level_alignment(resume_level, required_level)
        
        # Industry/domain experience
        domain_score = self._calculate_domain_match(resume_experience, job_data)
        
        final_score = (years_score * 0.5 + level_score * 0.3 + domain_score * 0.2)
        
        gap_analysis = self._generate_experience_gap_analysis(
            total_years, required_years, resume_level, required_level
        )
        
        return {
            'score': round(final_score),
            'total_years': total_years,
            'required_years': required_years,
            'level_match': resume_level == required_level,
            'gap_analysis': gap_analysis
        }

    def _calculate_education_match(self, resume_education: List[Dict], job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate education match score"""
        if not resume_education:
            return {'score': 50, 'analysis': 'No education data available'}
        
        job_description = job_data.get('description', '').lower()
        job_requirements = job_data.get('requirements', [])
        
        # Check for degree requirements
        requires_degree = any(
            keyword in job_description or any(keyword in req.lower() for req in job_requirements)
            for keyword in ['degree', 'bachelor', 'master', 'phd', 'education']
        )
        
        if not requires_degree:
            return {'score': 100, 'analysis': 'No specific education requirements'}
        
        # Analyze education level
        highest_degree = self._get_highest_degree(resume_education)
        required_degree = self._extract_required_degree(job_description, job_requirements)
        
        # Score based on degree match
        degree_scores = {
            'high_school': 20,
            'associate': 40,
            'bachelor': 70,
            'master': 90,
            'phd': 100
        }
        
        resume_score = degree_scores.get(highest_degree, 50)
        required_score = degree_scores.get(required_degree, 70)
        
        if resume_score >= required_score:
            final_score = 100
        else:
            final_score = max(50, (resume_score / required_score) * 100)
        
        return {
            'score': round(final_score),
            'highest_degree': highest_degree,
            'required_degree': required_degree,
            'analysis': f"Has {highest_degree}, requires {required_degree}"
        }

    async def _calculate_semantic_match(self, resume_data: Dict[str, Any], job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate semantic similarity between resume and job"""
        try:
            # Prepare text for comparison
            resume_text = self._prepare_resume_text(resume_data)
            job_text = self._prepare_job_text(job_data)
            
            if not resume_text or not job_text:
                return {'score': 50, 'similarity': 0.5}
            
            # Calculate TF-IDF similarity
            documents = [resume_text, job_text]
            tfidf_matrix = self.vectorizer.fit_transform(documents)
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            # Convert to percentage
            score = similarity * 100
            
            return {
                'score': round(score),
                'similarity': similarity,
                'analysis': f"Semantic similarity: {similarity:.2f}"
            }
        
        except Exception as e:
            print(f"Semantic matching error: {str(e)}")
            return {'score': 50, 'similarity': 0.5, 'analysis': 'Unable to calculate semantic similarity'}

    def _are_similar_skills(self, skill1: str, skill2: str) -> bool:
        """Check if two skills are similar"""
        # Define skill synonyms
        synonyms = {
            'javascript': ['js', 'node.js', 'nodejs'],
            'python': ['py'],
            'react': ['reactjs', 'react.js'],
            'angular': ['angularjs'],
            'vue': ['vuejs', 'vue.js'],
            'aws': ['amazon web services'],
            'gcp': ['google cloud platform'],
            'azure': ['microsoft azure'],
            'docker': ['containerization'],
            'kubernetes': ['k8s'],
            'postgresql': ['postgres'],
            'mongodb': ['mongo']
        }
        
        for main_skill, skill_synonyms in synonyms.items():
            if ((skill1 == main_skill and skill2 in skill_synonyms) or
                (skill2 == main_skill and skill1 in skill_synonyms) or
                (skill1 in skill_synonyms and skill2 in skill_synonyms)):
                return True
        
        return False

    def _apply_skill_weights(self, matching_skills: List[str], base_score: float) -> float:
        """Apply importance weights to skills"""
        if not matching_skills:
            return base_score
        
        # Categorize skills and apply weights
        weighted_score = base_score
        
        for skill in matching_skills:
            skill_lower = skill.lower()
            
            # Programming languages get higher weight
            if any(lang in skill_lower for lang in ['python', 'java', 'javascript', 'c++', 'c#']):
                weighted_score += 5
            
            # Frameworks get medium weight
            elif any(framework in skill_lower for framework in ['react', 'angular', 'vue', 'django', 'spring']):
                weighted_score += 3
            
            # Cloud technologies get high weight
            elif any(cloud in skill_lower for cloud in ['aws', 'azure', 'gcp', 'docker', 'kubernetes']):
                weighted_score += 4
        
        return min(100, weighted_score)

    def _extract_required_experience(self, job_title: str, job_description: str) -> int:
        """Extract required years of experience from job posting"""
        text = f"{job_title} {job_description}".lower()
        
        # Look for experience patterns
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:relevant\s*)?experience',
            r'minimum\s*(?:of\s*)?(\d+)\s*years?',
            r'at\s*least\s*(\d+)\s*years?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))
        
        # Default based on job title
        if any(level in job_title for level in ['senior', 'lead', 'principal']):
            return 5
        elif any(level in job_title for level in ['mid', 'intermediate']):
            return 3
        elif any(level in job_title for level in ['junior', 'entry']):
            return 1
        
        return 2  # Default

    def _determine_experience_level(self, years: float) -> str:
        """Determine experience level from years"""
        if years < 1:
            return 'entry'
        elif years < 3:
            return 'junior'
        elif years < 6:
            return 'mid'
        elif years < 10:
            return 'senior'
        else:
            return 'executive'

    def _extract_required_level(self, job_title: str, job_description: str) -> str:
        """Extract required experience level"""
        text = f"{job_title} {job_description}".lower()
        
        if any(level in text for level in ['senior', 'sr.', 'lead', 'principal']):
            return 'senior'
        elif any(level in text for level in ['junior', 'jr.', 'entry', 'graduate']):
            return 'junior'
        elif any(level in text for level in ['mid', 'intermediate']):
            return 'mid'
        
        return 'mid'  # Default

    def _calculate_level_alignment(self, resume_level: str, required_level: str) -> float:
        """Calculate alignment between experience levels"""
        resume_num = self.experience_levels.get(resume_level, 2)
        required_num = self.experience_levels.get(required_level, 2)
        
        if resume_num == required_num:
            return 100
        elif abs(resume_num - required_num) == 1:
            return 80
        elif abs(resume_num - required_num) == 2:
            return 60
        else:
            return 40

    def _calculate_domain_match(self, resume_experience: List[Dict], job_data: Dict[str, Any]) -> float:
        """Calculate domain/industry experience match"""
        # This is a simplified implementation
        # In practice, you'd use more sophisticated industry classification
        
        job_company = job_data.get('company', '').lower()
        job_description = job_data.get('description', '').lower()
        
        # Extract industry keywords from job
        job_industries = self._extract_industry_keywords(f"{job_company} {job_description}")
        
        # Extract industries from resume experience
        resume_industries = []
        for exp in resume_experience:
            company = exp.get('company', '').lower()
            description = exp.get('description', '').lower()
            resume_industries.extend(self._extract_industry_keywords(f"{company} {description}"))
        
        # Calculate overlap
        if not job_industries:
            return 70  # Neutral score if can't determine job industry
        
        matching_industries = set(job_industries) & set(resume_industries)
        if matching_industries:
            return 100
        else:
            return 50

    def _extract_industry_keywords(self, text: str) -> List[str]:
        """Extract industry keywords from text"""
        industries = {
            'fintech': ['finance', 'banking', 'fintech', 'payment', 'trading'],
            'healthcare': ['healthcare', 'medical', 'hospital', 'pharma'],
            'ecommerce': ['ecommerce', 'retail', 'shopping', 'marketplace'],
            'saas': ['saas', 'software', 'platform', 'cloud'],
            'gaming': ['gaming', 'game', 'entertainment'],
            'education': ['education', 'learning', 'university', 'school']
        }
        
        found_industries = []
        for industry, keywords in industries.items():
            if any(keyword in text for keyword in keywords):
                found_industries.append(industry)
        
        return found_industries

    def _get_highest_degree(self, education: List[Dict]) -> str:
        """Get highest degree from education list"""
        degree_hierarchy = ['phd', 'master', 'bachelor', 'associate', 'high_school']
        
        for degree_level in degree_hierarchy:
            for edu in education:
                degree = edu.get('degree', '').lower()
                if degree_level in degree or (degree_level == 'phd' and 'doctorate' in degree):
                    return degree_level
        
        return 'bachelor'  # Default

    def _extract_required_degree(self, job_description: str, job_requirements: List[str]) -> str:
        """Extract required degree from job posting"""
        text = f"{job_description} {' '.join(job_requirements)}".lower()
        
        if 'phd' in text or 'doctorate' in text:
            return 'phd'
        elif 'master' in text or 'mba' in text:
            return 'master'
        elif 'bachelor' in text or 'degree' in text:
            return 'bachelor'
        
        return 'bachelor'  # Default

    def _prepare_resume_text(self, resume_data: Dict[str, Any]) -> str:
        """Prepare resume text for semantic analysis"""
        text_parts = []
        
        # Add skills
        skills = resume_data.get('skills', [])
        if skills:
            text_parts.append(' '.join(skills))
        
        # Add experience descriptions
        experience = resume_data.get('experience', [])
        for exp in experience:
            if exp.get('description'):
                text_parts.append(exp['description'])
            if exp.get('position'):
                text_parts.append(exp['position'])
        
        # Add education
        education = resume_data.get('education', [])
        for edu in education:
            if edu.get('field'):
                text_parts.append(edu['field'])
            if edu.get('degree'):
                text_parts.append(edu['degree'])
        
        # Add summary
        summary = resume_data.get('summary', '')
        if summary:
            text_parts.append(summary)
        
        return ' '.join(text_parts)

    def _prepare_job_text(self, job_data: Dict[str, Any]) -> str:
        """Prepare job text for semantic analysis"""
        text_parts = []
        
        # Add job title
        title = job_data.get('title', '')
        if title:
            text_parts.append(title)
        
        # Add description
        description = job_data.get('description', '')
        if description:
            text_parts.append(description)
        
        # Add requirements
        requirements = job_data.get('requirements', [])
        if requirements:
            text_parts.extend(requirements)
        
        # Add skills
        skills = job_data.get('skills', [])
        if skills:
            text_parts.extend(skills)
        
        return ' '.join(text_parts)

    def _generate_experience_gap_analysis(self, total_years: float, required_years: int, 
                                        resume_level: str, required_level: str) -> str:
        """Generate experience gap analysis"""
        if total_years >= required_years and resume_level == required_level:
            return "Experience requirements fully met"
        
        gaps = []
        
        if total_years < required_years:
            gap_years = required_years - total_years
            gaps.append(f"Need {gap_years:.1f} more years of experience")
        
        if resume_level != required_level:
            gaps.append(f"Experience level: {resume_level}, required: {required_level}")
        
        return "; ".join(gaps) if gaps else "Experience requirements met"

    def _get_recommendation(self, final_score: float, skills_match: Dict, experience_match: Dict) -> str:
        """Get hiring recommendation based on scores"""
        if final_score >= 85:
            return 'highly_recommended'
        elif final_score >= 70:
            return 'recommended'
        elif final_score >= 50:
            return 'maybe'
        else:
            return 'not_recommended'

    def _generate_recommendations(self, skills_match: Dict, experience_match: Dict) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        # Skills recommendations
        missing_skills = skills_match.get('missing_skills', [])
        if missing_skills:
            recommendations.append(f"Consider developing skills in: {', '.join(missing_skills[:3])}")
        
        # Experience recommendations
        if experience_match.get('score', 0) < 70:
            recommendations.append("Gain more relevant work experience in the field")
        
        # General recommendations
        if skills_match.get('score', 0) < 60:
            recommendations.append("Expand technical skill set to better match job requirements")
        
        return recommendations