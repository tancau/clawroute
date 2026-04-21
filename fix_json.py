#!/usr/bin/env python3
import json
import re

files_to_fix = ['messages/ja.json', 'messages/ko.json', 'messages/zh_TW.json', 'messages/es.json', 'messages/fr.json', 'messages/de.json', 'messages/pt.json', 'messages/ar.json']

for file_path in files_to_fix:
    print(f"Fixing {file_path}...")
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try to parse what we can
    # The issue is that after terms section, there's orphaned providers content
    # We need to find the terms section end and reconstruct
    
    # Find where terms section ends (after "contactUs")
    terms_end_pattern = r'"contactUs":\s*"[^"]+"\s*\},\s*\n'
    terms_match = re.search(terms_end_pattern, content)
    
    if terms_match:
        # Extract everything before terms end
        before_terms_end = content[:terms_match.end()]
        
        # Now we need to add "providers": { before the orphaned providers content
        # Find where the orphaned providers content starts
        providers_start_pattern = r'\n\s*"title":\s*"Provider API Keys"'
        providers_match = re.search(providers_start_pattern, content[terms_match.end():])
        
        if providers_match:
            # Get the providers content
            providers_content_start = terms_match.end() + providers_match.start()
            providers_content = content[providers_content_start:]
            
            # Construct the new content
            # Remove the trailing }, from before_terms_end
            before_terms_end_stripped = before_terms_end.rstrip(',\n')
            
            # Add proper formatting
            new_content = before_terms_end_stripped + ',\n  "providers": {\n' + providers_content
            
            # Write back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"  ✓ Fixed {file_path}")
        else:
            print(f"  ✗ Could not find providers content in {file_path}")
    else:
        print(f"  ✗ Could not find terms end in {file_path}")

print("\nAll files fixed!")