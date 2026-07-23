from jinja2 import Template

SUMMARY_PROMPT = Template('''
Analyze the following patient history:
Patient: {{ patient.name.display }} (DOB: {{ patient.dob }})
Gender: {{ patient.gender }}
Blood Type: {{ patient.blood_type }}

Based on the above, provide a brief 3-sentence clinical summary.
''')
