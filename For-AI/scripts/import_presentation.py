#!/usr/bin/env python3
"""Extract the supplied image/video PPTX into browser assets. Standard library only."""
from __future__ import annotations
import argparse
import hashlib
import json
import posixpath
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
TITLES = ['Beyond the Line', 'Why this matters to me', 'What happens when a border is drawn?', 'Rabia Saleemi', 'Joseph Potts', 'Haaji Ka Halva', 'How I work with people', 'Holding the space', 'Community co-creation', 'Meta Art', 'No one', 'One person', 'Two people', 'Connection requires both people', 'How it comes together', 'What remains?']

def convert(source: Path, out: Path) -> dict:
    if source.stat().st_size > 100 * 1024 * 1024:
        raise ValueError('PPTX exceeds the 100 MB import limit.')
    out.mkdir(parents=True, exist_ok=True)
    with ZipFile(source) as archive:
        if sum(i.file_size for i in archive.infolist()) > 180 * 1024 * 1024:
            raise ValueError('Expanded PPTX exceeds the import limit.')
        def xml(part: str):
            return ET.fromstring(archive.read(part))
        def rels(part: str) -> dict:
            return {el.attrib['Id']: el.attrib['Target'] for el in xml(part) if el.get('TargetMode') != 'External'}
        presentation = xml('ppt/presentation.xml')
        dimensions = presentation.find(f'{{{P}}}sldSz')
        width, height = int(dimensions.get('cx')), int(dimensions.get('cy'))
        relationships = rels('ppt/_rels/presentation.xml.rels')
        inventory = {}
        def copy_asset(base: str, target: str) -> str:
            part = posixpath.normpath(posixpath.join(base, target))
            if not part.startswith('ppt/media/'):
                raise ValueError(f'Not an embedded media asset: {part}')
            name = posixpath.basename(part)
            if Path(name).suffix.lower() not in {'.png', '.jpg', '.jpeg', '.mp4', '.mp3', '.m4a', '.wav', '.svg'}:
                raise ValueError(f'Unsupported media: {name}')
            data = archive.read(part)
            (out / name).write_bytes(data)
            inventory[name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
            return f'/assets/beyond-the-line/{name}'
        slides = []
        for index, slide_id in enumerate(presentation.findall(f'.//{{{P}}}sldId')):
            slide_path = posixpath.normpath(posixpath.join('ppt', relationships[slide_id.get(f'{{{R}}}id')]))
            base, name = posixpath.split(slide_path)
            links = rels(f'{base}/_rels/{name}.rels')
            doc = xml(slide_path)
            if doc.findall(f'.//{{{A}}}t'):
                raise ValueError('This exporter is for the supplied flattened deck, not editable text slides.')
            layers = []
            for picture in doc.findall(f'.//{{{P}}}pic'):
                transform = picture.find(f'.//{{{A}}}xfrm')
                offset, extent = transform.find(f'{{{A}}}off'), transform.find(f'{{{A}}}ext')
                box = [int(offset.get('x'))/width, int(offset.get('y'))/height, int(extent.get('cx'))/width, int(extent.get('cy'))/height]
                image = picture.find(f'.//{{{A}}}blip')
                poster = copy_asset(base, links[image.get(f'{{{R}}}embed')])
                video = picture.find(f'.//{{{A}}}videoFile')
                audio = picture.find(f'.//{{{A}}}audioFile')
                media = video if video is not None else audio
                props = picture.find(f'.//{{{P}}}cNvPr')
                layers.append({'kind': 'image' if media is None else ('video' if video is not None else 'audio'), 'src': poster if media is None else copy_asset(base, links[media.get(f'{{{R}}}link')]), 'poster': poster, 'box': box, 'label': props.get('name', f'Slide {index+1}'), 'volume': 0.8})
            slides.append({'title': TITLES[index] if index < len(TITLES) else f'Slide {index+1}', 'layers': layers})
    manifest = {'title': 'Beyond the Line', 'width': width, 'height': height, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'slides': slides}
    (out / 'deck.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'slides': len(slides), 'media': sum(x['kind'] != 'image' for s in slides for x in s['layers']), 'assets': inventory, 'sourceSha256': manifest['sourceSha256']}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[2] / 'assets' / 'beyond-the-line')
    args = parser.parse_args()
    report = convert(args.source, args.out)
    print(json.dumps(report, indent=2))
