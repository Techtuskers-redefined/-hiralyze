import os
import re
import requests
from typing import Dict, List, Any
import PyPDF2
from docx import Document
from PIL import Image
import pytesseract
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
import spacy

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class ResumeParser:
    def __init__(self):
        # Load spaCy model for NER
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("Warning: spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
        
        self.stop_words = set(stopwords.words('english'))
        
        # Common skill keywords
        self.tech_skills = {
            'programming': ['python', 'java', 'javascript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'],
            'web': ['html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring'],
            'database': ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sqlite'],
            'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins'],
            'data': ['pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'tableau', 'power bi'],
            'mobile': ['android', 'ios', 'react native', 'flutter', 'xamarin'],
            'tools': ['git', 'jira', 'confluence', 'slack', 'figma', 'photoshop']
        }

    async def parse_resume(self, file_url: str, file_name: str) -> Dict[str, Any]:
        """Parse resume from URL"""
        try:
            # Download file
            response = requests.get(file_url)
            temp_path = f"/tmp/{file_name}"
            
            with open(temp_path, 'wb') as f:
                f.write(response.content)
            
            # Parse file
            parsed_data = await self.parse_file(temp_path)
            
            # Clean up
            os.remove(temp_path)
            
            return parsed_data
        
        except Exception as e:
            raise Exception(f"Failed to parse resume: {str(e)}")

    async def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parse resume file"""
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension == '.pdf':
            text = self._extract_text_from_pdf(file_path)
        elif file_extension in ['.doc', '.docx']:
            text = self._extract_text_from_docx(file_path)
        elif file_extension in ['.jpg', '.jpeg', '.png']:
            text = self._extract_text_from_image(file_path)
        else:
            raise Exception(f"Unsupported file format: {file_extension}")
        
        # Parse structured data from text
        parsed_data = self._parse_text_content(text)
        
        return parsed_data

    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
        
        return text

    def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX"""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
        except Exception as e:
            raise Exception(f"Failed to extract text from DOCX: {str(e)}")
        
        return text

    def _extract_text_from_image(self, file_path: str) -> str:
        """Extract text from image using OCR"""
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
        except Exception as e:
            raise Exception(f"Failed to extract text from image: {str(e)}")
        
        return text

    def _parse_text_content(self, text: str) -> Dict[str, Any]:
        """Parse structured data from text"""
        parsed_data = {
            'personal_info': self._extract_personal_info(text),
            'summary': self._extract_summary(text),
            'skills': self._extract_skills(text),
            'experience': self._extract_experience(text),
            'education': self._extract_education(text),
            'certifications': self._extract_certifications(text),
            'languages': self._extract_languages(text),
            'projects': self._extract_projects(text)
        }
        
        return parsed_data

    def _extract_personal_info(self, text: str) -> Dict[str, str]:
        """Extract personal information"""
        personal_info = {}
        
        # Extract email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            personal_info['email'] = emails[0]
        
        # Extract phone
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        phones = re.findall(phone_pattern, text)
        if phones:
            personal_info['phone'] = ''.join(phones[0]) if isinstance(phones[0], tuple) else phones[0]
        
        # Extract name (first few words, excluding common resume headers)
        lines = text.split('\n')
        for line in lines[:5]:
            line = line.strip()
            if line and not any(header in line.lower() for header in ['resume', 'cv', 'curriculum']):
                words = line.split()
                if 2 <= len(words) <= 4 and all(word.isalpha() for word in words):
                    personal_info['name'] = line
                    break
        
        # Extract location (basic pattern matching)
        location_patterns = [
            r'([A-Za-z\s]+,\s*[A-Z]{2})',  # City, State
            r'([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2,3})',  # City, State, Country
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, text)
            if matches:
                personal_info['location'] = matches[0]
                break
        
        return personal_info

    def _extract_summary(self, text: str) -> str:
        """Extract professional summary"""
        summary_keywords = ['summary', 'objective', 'profile', 'about']
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in summary_keywords):
                # Get next few lines as summary
                summary_lines = []
                for j in range(i + 1, min(i + 5, len(lines))):
                    if lines[j].strip() and not any(header in lines[j].lower() for header in ['experience', 'education', 'skills']):
                        summary_lines.append(lines[j].strip())
                    else:
                        break
                
                if summary_lines:
                    return ' '.join(summary_lines)
        
        return ""

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from text"""
        skills = set()
        text_lower = text.lower()
        
        # Extract from all skill categories
        for category, skill_list in self.tech_skills.items():
            for skill in skill_list:
                if skill in text_lower:
                    skills.add(skill.title())
        
        # Look for skills section
        skills_section = self._find_section(text, ['skills', 'technical skills', 'technologies'])
        if skills_section:
            # Extract skills from skills section
            words = word_tokenize(skills_section.lower())
            for word in words:
                if word not in self.stop_words and len(word) > 2:
                    for category, skill_list in self.tech_skills.items():
                        if word in skill_list:
                            skills.add(word.title())
        
        return list(skills)

    def _extract_experience(self, text: str) -> List[Dict[str, Any]]:
        """Extract work experience"""
        experience = []
        experience_section = self._find_section(text, ['experience', 'work experience', 'employment'])
        
        if not experience_section:
            return experience
        
        # Split by common patterns that indicate new job entries
        job_entries = re.split(r'\n(?=[A-Z][^a-z]*(?:Engineer|Developer|Manager|Analyst|Specialist|Coordinator|Director|Lead|Senior|Junior))', experience_section)
        
        for entry in job_entries:
            if len(entry.strip()) < 20:  # Skip very short entries
                continue
            
            job_info = self._parse_job_entry(entry)
            if job_info:
                experience.append(job_info)
        
        return experience

    def _parse_job_entry(self, entry: str) -> Dict[str, Any]:
        """Parse individual job entry"""
        lines = [line.strip() for line in entry.split('\n') if line.strip()]
        if not lines:
            return None
        
        job_info = {
            'company': '',
            'position': '',
            'start_date': '',
            'end_date': '',
            'current': False,
            'description': '',
            'duration': 0
        }
        
        # First line usually contains position and/or company
        first_line = lines[0]
        
        # Look for company and position patterns
        if ' at ' in first_line:
            parts = first_line.split(' at ')
            job_info['position'] = parts[0].strip()
            job_info['company'] = parts[1].strip()
        elif ' - ' in first_line:
            parts = first_line.split(' - ')
            job_info['position'] = parts[0].strip()
            if len(parts) > 1:
                job_info['company'] = parts[1].strip()
        else:
            job_info['position'] = first_line
        
        # Look for dates
        date_pattern = r'(\d{1,2}/\d{4}|\d{4}|[A-Za-z]+\s+\d{4})'
        dates = re.findall(date_pattern, entry)
        
        if dates:
            job_info['start_date'] = dates[0]
            if len(dates) > 1 and 'present' not in dates[1].lower():
                job_info['end_date'] = dates[1]
            elif 'present' in entry.lower() or 'current' in entry.lower():
                job_info['current'] = True
                job_info['end_date'] = 'Present'
        
        # Extract description (remaining lines)
        description_lines = lines[1:] if len(lines) > 1 else []
        job_info['description'] = ' '.join(description_lines)
        
        # Calculate duration (simplified)
        if job_info['start_date']:
            try:
                start_year = int(re.search(r'\d{4}', job_info['start_date']).group())
                if job_info['current']:
                    end_year = 2024  # Current year
                elif job_info['end_date']:
                    end_year = int(re.search(r'\d{4}', job_info['end_date']).group())
                else:
                    end_year = start_year
                
                job_info['duration'] = max(0, end_year - start_year)
            except:
                job_info['duration'] = 1  # Default to 1 year
        
        return job_info

    def _extract_education(self, text: str) -> List[Dict[str, str]]:
        """Extract education information"""
        education = []
        education_section = self._find_section(text, ['education', 'academic background'])
        
        if not education_section:
            return education
        
        # Look for degree patterns
        degree_patterns = [
            r'(Bachelor|Master|PhD|Doctorate|Associate).*?(?:in|of)\s+([^,\n]+)',
            r'(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|B\.?A\.?|M\.?A\.?).*?(?:in|of)?\s+([^,\n]+)',
        ]
        
        lines = education_section.split('\n')
        current_entry = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for degree patterns
            for pattern in degree_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    current_entry['degree'] = match.group(1)
                    current_entry['field'] = match.group(2).strip()
                    break
            
            # Look for institution names (usually capitalized)
            if 'university' in line.lower() or 'college' in line.lower() or 'institute' in line.lower():
                current_entry['institution'] = line
            
            # Look for dates
            date_match = re.search(r'(\d{4})', line)
            if date_match:
                if 'start_date' not in current_entry:
                    current_entry['start_date'] = date_match.group(1)
                else:
                    current_entry['end_date'] = date_match.group(1)
            
            # Look for GPA
            gpa_match = re.search(r'GPA:?\s*(\d+\.?\d*)', line, re.IGNORECASE)
            if gpa_match:
                current_entry['gpa'] = gpa_match.group(1)
        
        if current_entry:
            education.append(current_entry)
        
        return education

    def _extract_certifications(self, text: str) -> List[Dict[str, str]]:
        """Extract certifications"""
        certifications = []
        cert_section = self._find_section(text, ['certifications', 'certificates', 'licenses'])
        
        if not cert_section:
            return certifications
        
        lines = cert_section.split('\n')
        for line in lines:
            line = line.strip()
            if len(line) > 10:  # Skip very short lines
                cert_info = {
                    'name': line,
                    'issuer': '',
                    'date': '',
                    'expiry_date': ''
                }
                
                # Look for common certification issuers
                issuers = ['AWS', 'Microsoft', 'Google', 'Oracle', 'Cisco', 'CompTIA', 'PMI']
                for issuer in issuers:
                    if issuer.lower() in line.lower():
                        cert_info['issuer'] = issuer
                        break
                
                # Look for dates
                date_match = re.search(r'(\d{4})', line)
                if date_match:
                    cert_info['date'] = date_match.group(1)
                
                certifications.append(cert_info)
        
        return certifications

    def _extract_languages(self, text: str) -> List[str]:
        """Extract languages"""
        languages = []
        common_languages = [
            'english', 'spanish', 'french', 'german', 'italian', 'portuguese',
            'chinese', 'japanese', 'korean', 'arabic', 'hindi', 'russian'
        ]
        
        text_lower = text.lower()
        for language in common_languages:
            if language in text_lower:
                languages.append(language.title())
        
        return languages

    def _extract_projects(self, text: str) -> List[Dict[str, Any]]:
        """Extract projects"""
        projects = []
        projects_section = self._find_section(text, ['projects', 'personal projects', 'side projects'])
        
        if not projects_section:
            return projects
        
        # Simple project extraction
        lines = projects_section.split('\n')
        current_project = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for URLs
            url_match = re.search(r'https?://[^\s]+', line)
            if url_match:
                current_project['url'] = url_match.group()
                line = line.replace(url_match.group(), '').strip()
            
            # If line looks like a project title (short and capitalized)
            if len(line.split()) <= 5 and any(c.isupper() for c in line):
                if current_project:
                    projects.append(current_project)
                current_project = {'name': line, 'description': '', 'technologies': []}
            else:
                # Add to description
                if 'description' in current_project:
                    current_project['description'] += ' ' + line
        
        if current_project:
            projects.append(current_project)
        
        return projects

    def _find_section(self, text: str, keywords: List[str]) -> str:
        """Find a section in the text based on keywords"""
        lines = text.split('\n')
        section_start = -1
        
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in keywords):
                section_start = i
                break
        
        if section_start == -1:
            return ""
        
        # Find section end (next major section or end of text)
        section_end = len(lines)
        major_sections = ['experience', 'education', 'skills', 'projects', 'certifications']
        
        for i in range(section_start + 1, len(lines)):
            line = lines[i].lower().strip()
            if any(section in line for section in major_sections) and line != lines[section_start].lower().strip():
                section_end = i
                break
        
        return '\n'.join(lines[section_start + 1:section_end])