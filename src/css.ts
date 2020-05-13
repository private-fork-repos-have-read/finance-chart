import jss from 'jss';
import preset from 'jss-preset-default';

jss.setup(preset());

const styles = {
  'finance-chart': {
    position: 'relative',
    '& canvas': {
      '-webkit-tap-highlight-color': 'transparent',
      'user-select': 'none',
    },
  },
  detail: {
    boxSizing: 'border-box',
    position: 'absolute',
    padding: '8px',
    width: '120px',
    background: '#F0F2F2',
    top: '30px',
    right: '0',
    display: 'none',
    color: '#5E667F',
    fontSize: '12px',
  },
  title: {
    textAlign: 'center',
    paddingBottom: 6,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    '& span': {
      display: 'inline-block',
    },
  },
};

export default jss.createStyleSheet(styles).attach();
