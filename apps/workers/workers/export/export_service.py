"""Export service for generating workout reports in various formats."""

import asyncio
import logging
import json
import csv
import io
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import base64
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.linecharts import HorizontalLineChart
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab not available, PDF export will be disabled")


@dataclass
class ExportRequest:
    """Export request configuration."""
    user_id: str
    session_ids: List[str]
    format: str  # 'pdf', 'csv', 'json'
    date_range: Optional[Dict[str, str]] = None
    include_charts: bool = True
    include_pose_data: bool = False
    template: str = 'standard'
    custom_fields: List[str] = None


@dataclass
class SessionSummary:
    """Session summary for export."""
    session_id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: float
    exercises: List[Dict[str, Any]]
    total_reps: int
    average_form_score: float
    average_tempo_score: float
    average_rom_score: float
    calories_burned: Optional[float]
    notes: Optional[str]


class ExportService:
    """Service for generating workout reports in multiple formats."""
    
    def __init__(self):
        self.templates = self._load_templates()
        self.output_dir = Path("exports")
        self.output_dir.mkdir(exist_ok=True)
        
    def _load_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load export templates."""
        return {
            'standard': {
                'title': 'Workout Report',
                'sections': ['summary', 'exercises', 'progress', 'recommendations'],
                'charts': ['progress_timeline', 'exercise_breakdown'],
            },
            'detailed': {
                'title': 'Detailed Workout Analysis',
                'sections': ['summary', 'exercises', 'form_analysis', 'progress', 'recommendations'],
                'charts': ['progress_timeline', 'exercise_breakdown', 'form_scores'],
            },
            'summary': {
                'title': 'Workout Summary',
                'sections': ['summary', 'key_metrics'],
                'charts': ['progress_timeline'],
            },
        }

    async def generate_export(self, request: ExportRequest) -> Dict[str, Any]:
        """Generate export in requested format."""
        try:
            # Fetch session data
            sessions = await self._fetch_session_data(request)
            
            if not sessions:
                return {
                    'success': False,
                    'error': 'No sessions found for export'
                }
            
            # Generate export based on format
            if request.format.lower() == 'pdf':
                result = await self._generate_pdf_export(sessions, request)
            elif request.format.lower() == 'csv':
                result = await self._generate_csv_export(sessions, request)
            elif request.format.lower() == 'json':
                result = await self._generate_json_export(sessions, request)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported export format: {request.format}'
                }
            
            return {
                'success': True,
                'export_id': f"export_{request.user_id}_{int(datetime.now().timestamp())}",
                'format': request.format,
                'file_size': len(result.get('data', b'')),
                'sessions_count': len(sessions),
                'generated_at': datetime.now().isoformat(),
                **result
            }
            
        except Exception as e:
            logger.error(f"Error generating export: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def _fetch_session_data(self, request: ExportRequest) -> List[SessionSummary]:
        """Fetch session data for export."""
        # Mock session data - in real app, this would query the database
        sessions = []
        
        for i, session_id in enumerate(request.session_ids):
            # Generate mock session data
            start_time = datetime.now() - timedelta(days=i * 2)
            end_time = start_time + timedelta(minutes=30 + i * 5)
            
            exercises = [
                {
                    'name': 'Push-ups',
                    'sets': 3,
                    'reps': 15 + i,
                    'form_score': 85 + i * 2,
                    'tempo_score': 80 + i,
                    'rom_score': 88 + i,
                    'duration_seconds': 180 + i * 10,
                },
                {
                    'name': 'Squats',
                    'sets': 3,
                    'reps': 20 + i,
                    'form_score': 82 + i * 3,
                    'tempo_score': 78 + i * 2,
                    'rom_score': 85 + i,
                    'duration_seconds': 240 + i * 15,
                },
            ]
            
            total_reps = sum(ex['reps'] * ex['sets'] for ex in exercises)
            avg_form = sum(ex['form_score'] for ex in exercises) / len(exercises)
            avg_tempo = sum(ex['tempo_score'] for ex in exercises) / len(exercises)
            avg_rom = sum(ex['rom_score'] for ex in exercises) / len(exercises)
            
            session = SessionSummary(
                session_id=session_id,
                user_id=request.user_id,
                start_time=start_time,
                end_time=end_time,
                duration_minutes=(end_time - start_time).total_seconds() / 60,
                exercises=exercises,
                total_reps=total_reps,
                average_form_score=avg_form,
                average_tempo_score=avg_tempo,
                average_rom_score=avg_rom,
                calories_burned=150 + i * 20,
                notes=f"Great workout session #{i + 1}!"
            )
            
            sessions.append(session)
        
        return sessions

    async def _generate_pdf_export(self, sessions: List[SessionSummary], request: ExportRequest) -> Dict[str, Any]:
        """Generate PDF export."""
        if not REPORTLAB_AVAILABLE:
            return {
                'success': False,
                'error': 'PDF export not available - ReportLab not installed'
            }
        
        try:
            # Create PDF buffer
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            
            # Get styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                textColor=colors.darkblue,
                alignment=1  # Center
            )
            
            # Build PDF content
            story = []
            
            # Title
            template = self.templates.get(request.template, self.templates['standard'])
            story.append(Paragraph(template['title'], title_style))
            story.append(Spacer(1, 20))
            
            # Summary section
            if 'summary' in template['sections']:
                story.extend(await self._create_summary_section(sessions, styles))
            
            # Exercises section
            if 'exercises' in template['sections']:
                story.extend(await self._create_exercises_section(sessions, styles))
            
            # Progress section
            if 'progress' in template['sections']:
                story.extend(await self._create_progress_section(sessions, styles))
            
            # Build PDF
            doc.build(story)
            
            # Get PDF data
            pdf_data = buffer.getvalue()
            buffer.close()
            
            return {
                'data': pdf_data,
                'filename': f"workout_report_{request.user_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
                'mime_type': 'application/pdf'
            }
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            return {
                'success': False,
                'error': f'PDF generation failed: {str(e)}'
            }

    async def _create_summary_section(self, sessions: List[SessionSummary], styles) -> List:
        """Create summary section for PDF."""
        content = []
        
        # Section title
        content.append(Paragraph("Workout Summary", styles['Heading2']))
        content.append(Spacer(1, 12))
        
        # Calculate totals
        total_sessions = len(sessions)
        total_duration = sum(s.duration_minutes for s in sessions)
        total_reps = sum(s.total_reps for s in sessions)
        avg_form_score = sum(s.average_form_score for s in sessions) / total_sessions if total_sessions > 0 else 0
        total_calories = sum(s.calories_burned or 0 for s in sessions)
        
        # Summary table
        summary_data = [
            ['Metric', 'Value'],
            ['Total Sessions', str(total_sessions)],
            ['Total Duration', f"{total_duration:.1f} minutes"],
            ['Total Reps', f"{total_reps:,}"],
            ['Average Form Score', f"{avg_form_score:.1f}%"],
            ['Calories Burned', f"{total_calories:.0f}"],
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        content.append(summary_table)
        content.append(Spacer(1, 20))
        
        return content

    async def _create_exercises_section(self, sessions: List[SessionSummary], styles) -> List:
        """Create exercises section for PDF."""
        content = []
        
        # Section title
        content.append(Paragraph("Exercise Details", styles['Heading2']))
        content.append(Spacer(1, 12))
        
        # Exercise breakdown
        exercise_totals = {}
        for session in sessions:
            for exercise in session.exercises:
                name = exercise['name']
                if name not in exercise_totals:
                    exercise_totals[name] = {
                        'total_reps': 0,
                        'total_sets': 0,
                        'avg_form': [],
                        'total_duration': 0
                    }
                
                exercise_totals[name]['total_reps'] += exercise['reps'] * exercise['sets']
                exercise_totals[name]['total_sets'] += exercise['sets']
                exercise_totals[name]['avg_form'].append(exercise['form_score'])
                exercise_totals[name]['total_duration'] += exercise['duration_seconds']
        
        # Create exercise table
        exercise_data = [['Exercise', 'Total Reps', 'Total Sets', 'Avg Form Score', 'Total Duration']]
        
        for name, data in exercise_totals.items():
            avg_form = sum(data['avg_form']) / len(data['avg_form'])
            duration_min = data['total_duration'] / 60
            
            exercise_data.append([
                name,
                str(data['total_reps']),
                str(data['total_sets']),
                f"{avg_form:.1f}%",
                f"{duration_min:.1f}m"
            ])
        
        exercise_table = Table(exercise_data, colWidths=[1.5*inch, inch, inch, 1.2*inch, 1.2*inch])
        exercise_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        content.append(exercise_table)
        content.append(Spacer(1, 20))
        
        return content

    async def _create_progress_section(self, sessions: List[SessionSummary], styles) -> List:
        """Create progress section for PDF."""
        content = []
        
        # Section title
        content.append(Paragraph("Progress Analysis", styles['Heading2']))
        content.append(Spacer(1, 12))
        
        # Progress insights
        if len(sessions) > 1:
            first_session = sessions[-1]  # Oldest
            last_session = sessions[0]   # Newest
            
            form_improvement = last_session.average_form_score - first_session.average_form_score
            rep_improvement = last_session.total_reps - first_session.total_reps
            
            insights = [
                f"Form Score Change: {form_improvement:+.1f}%",
                f"Rep Count Change: {rep_improvement:+d} reps per session",
                f"Most Recent Session: {last_session.start_time.strftime('%Y-%m-%d')}",
                f"Session Frequency: {len(sessions)} sessions analyzed"
            ]
            
            for insight in insights:
                content.append(Paragraph(f"• {insight}", styles['Normal']))
            
            content.append(Spacer(1, 20))
        
        return content

    async def _generate_csv_export(self, sessions: List[SessionSummary], request: ExportRequest) -> Dict[str, Any]:
        """Generate CSV export."""
        try:
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            headers = [
                'Session ID', 'Date', 'Duration (min)', 'Total Reps',
                'Avg Form Score', 'Avg Tempo Score', 'Avg ROM Score',
                'Calories Burned', 'Notes'
            ]
            
            # Add exercise-specific columns if requested
            if request.custom_fields and 'exercise_details' in request.custom_fields:
                # Get all unique exercises
                all_exercises = set()
                for session in sessions:
                    for exercise in session.exercises:
                        all_exercises.add(exercise['name'])
                
                for exercise in sorted(all_exercises):
                    headers.extend([
                        f'{exercise} Reps',
                        f'{exercise} Form Score',
                        f'{exercise} Duration (s)'
                    ])
            
            writer.writerow(headers)
            
            # Write session data
            for session in sessions:
                row = [
                    session.session_id,
                    session.start_time.strftime('%Y-%m-%d %H:%M'),
                    f"{session.duration_minutes:.1f}",
                    session.total_reps,
                    f"{session.average_form_score:.1f}",
                    f"{session.average_tempo_score:.1f}",
                    f"{session.average_rom_score:.1f}",
                    session.calories_burned or 0,
                    session.notes or ''
                ]
                
                # Add exercise details if requested
                if request.custom_fields and 'exercise_details' in request.custom_fields:
                    exercise_data = {ex['name']: ex for ex in session.exercises}
                    
                    for exercise_name in sorted(all_exercises):
                        if exercise_name in exercise_data:
                            ex = exercise_data[exercise_name]
                            row.extend([
                                ex['reps'] * ex['sets'],
                                ex['form_score'],
                                ex['duration_seconds']
                            ])
                        else:
                            row.extend([0, 0, 0])
                
                writer.writerow(row)
            
            csv_data = output.getvalue().encode('utf-8')
            output.close()
            
            return {
                'data': csv_data,
                'filename': f"workout_data_{request.user_id}_{datetime.now().strftime('%Y%m%d')}.csv",
                'mime_type': 'text/csv'
            }
            
        except Exception as e:
            logger.error(f"Error generating CSV: {e}")
            return {
                'success': False,
                'error': f'CSV generation failed: {str(e)}'
            }

    async def _generate_json_export(self, sessions: List[SessionSummary], request: ExportRequest) -> Dict[str, Any]:
        """Generate JSON export."""
        try:
            # Convert sessions to dict format
            export_data = {
                'export_info': {
                    'user_id': request.user_id,
                    'generated_at': datetime.now().isoformat(),
                    'format': 'json',
                    'template': request.template,
                    'sessions_count': len(sessions),
                },
                'sessions': []
            }
            
            for session in sessions:
                session_data = asdict(session)
                # Convert datetime objects to ISO strings
                session_data['start_time'] = session.start_time.isoformat()
                if session.end_time:
                    session_data['end_time'] = session.end_time.isoformat()
                
                export_data['sessions'].append(session_data)
            
            # Calculate summary statistics
            if sessions:
                export_data['summary'] = {
                    'total_sessions': len(sessions),
                    'total_duration_minutes': sum(s.duration_minutes for s in sessions),
                    'total_reps': sum(s.total_reps for s in sessions),
                    'average_form_score': sum(s.average_form_score for s in sessions) / len(sessions),
                    'average_tempo_score': sum(s.average_tempo_score for s in sessions) / len(sessions),
                    'average_rom_score': sum(s.average_rom_score for s in sessions) / len(sessions),
                    'total_calories': sum(s.calories_burned or 0 for s in sessions),
                    'date_range': {
                        'start': min(s.start_time for s in sessions).isoformat(),
                        'end': max(s.start_time for s in sessions).isoformat(),
                    }
                }
            
            json_data = json.dumps(export_data, indent=2).encode('utf-8')
            
            return {
                'data': json_data,
                'filename': f"workout_data_{request.user_id}_{datetime.now().strftime('%Y%m%d')}.json",
                'mime_type': 'application/json'
            }
            
        except Exception as e:
            logger.error(f"Error generating JSON: {e}")
            return {
                'success': False,
                'error': f'JSON generation failed: {str(e)}'
            }

    async def get_export_templates(self) -> Dict[str, Any]:
        """Get available export templates."""
        return {
            'templates': self.templates,
            'formats': ['pdf', 'csv', 'json'],
            'custom_fields': [
                'exercise_details',
                'pose_data',
                'form_analysis',
                'coaching_cues'
            ]
        }

    async def validate_export_request(self, request: ExportRequest) -> Dict[str, Any]:
        """Validate export request parameters."""
        errors = []
        
        if not request.user_id:
            errors.append("User ID is required")
        
        if not request.session_ids:
            errors.append("At least one session ID is required")
        
        if request.format not in ['pdf', 'csv', 'json']:
            errors.append(f"Unsupported format: {request.format}")
        
        if request.template not in self.templates:
            errors.append(f"Unknown template: {request.template}")
        
        if request.format == 'pdf' and not REPORTLAB_AVAILABLE:
            errors.append("PDF export not available - ReportLab not installed")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
